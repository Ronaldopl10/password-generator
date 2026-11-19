/**
 * Mide las cajas de las páginas públicas (register / login / pricing) y extrae
 * los colores de marca desde el DOM real. Guarda out/measure.json para que
 * build.py recorte sin hardcodear coordenadas.
 */
const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");

const OUT = path.join(__dirname, "out");
const CHROME = "/usr/bin/google-chrome";
const BASE = "https://iron-key.vercel.app";
const DSF = 2;

const PAGES = [
  { name: "register", url: "/register", titles: ["Crear cuenta", "Regístrate para guardar tus contraseñas"] },
  { name: "login", url: "/login", titles: ["Iniciar sesión"] },
  { name: "pricing", url: "/pricing", titles: ["Planes y Precios", "Free", "Pro+"] },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-color-profile=srgb", "--hide-scrollbars"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: DSF,
    locale: "es-ES",
    colorScheme: "dark",
  });

  const result = { dsf: DSF, pages: {}, brand: {} };

  for (const p of PAGES) {
    const page = await ctx.newPage();
    await page.goto(BASE + p.url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1200);

    const data = await page.evaluate((titles) => {
      const smallest = (txt) => {
        const all = [...document.querySelectorAll("*")].filter(
          (e) => e.children.length === 0 && (e.innerText || "").trim().includes(txt)
        );
        all.sort((a, b) => {
          const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
          return ra.width * ra.height - rb.width * rb.height;
        });
        return all[0] || null;
      };
      const cardOf = (txt, maxH) => {
        let el = smallest(txt);
        if (!el) return null;
        let best = null;
        for (let i = 0; i < 9 && el; i++) {
          const r = el.getBoundingClientRect();
          const bg = getComputedStyle(el).backgroundColor;
          const solid = bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
          if (r.width < 1900 && r.height > 60 && r.height < (maxH || 900)) {
            best = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bg };
            if (solid) break;
          }
          el = el.parentElement;
        }
        return best;
      };
      const out = {};
      titles.forEach((t, i) => {
        const c = cardOf(t, i === 0 ? 900 : 1200);
        if (c) out[`c${i}`] = c;
      });
      // botón primario (color de marca)
      const btn = [...document.querySelectorAll("button,a")].find((b) =>
        /Registrarse|Comenzar|Probar|Continuar|Iniciar sesión/i.test(b.innerText || "")
      );
      if (btn) {
        const cs = getComputedStyle(btn);
        out.primaryBtn = { bg: cs.backgroundColor, color: cs.color, radius: cs.borderRadius };
      }
      // logo de la app (svg con currentColor)
      const svg = document.querySelector("header svg, nav svg, a svg");
      if (svg) {
        const r = svg.getBoundingClientRect();
        out.logo = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), color: getComputedStyle(svg).color };
      }
      out.bodyBg = getComputedStyle(document.body).backgroundColor;
      out.title = document.title;
      out.pageH = document.body.scrollHeight;
      return out;
    }, p.titles);

    result.pages[p.name] = data;
    console.log(p.name, JSON.stringify(data));
    await page.close();
  }

  // Colores de marca: sacarlos de la home y del botón del dashboard (público no sirve) → pricing
  const page = await ctx.newPage();
  await page.goto(BASE + "/pricing", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(800);
  const brand = await page.evaluate(() => {
    const gold = [...document.querySelectorAll("*")].find((e) => {
      const c = getComputedStyle(e).backgroundColor;
      const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return m && +m[1] > 150 && +m[2] > 90 && +m[3] < 90;
    });
    return {
      bodyBg: getComputedStyle(document.body).backgroundColor,
      gold: gold ? getComputedStyle(gold).backgroundColor : null,
      goldText: [...document.querySelectorAll("*")]
        .map((e) => getComputedStyle(e).color)
        .find((c) => {
          const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          return m && +m[1] > 150 && +m[2] > 90 && +m[3] < 90;
        }),
    };
  });
  result.brand = brand;
  console.log("brand:", JSON.stringify(brand));
  await page.close();

  fs.writeFileSync(path.join(OUT, "measure.json"), JSON.stringify(result, null, 1));
  console.log("-> out/measure.json");
  await browser.close();
})();
