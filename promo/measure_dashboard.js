/**
 * Reporta bounding boxes (CSS px) de los elementos clave del dashboard para
 * calcular recortes exactos (x2 = device px) en el pipeline.
 */
const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");

const CHROME = "/usr/bin/google-chrome";
const BASE = "https://iron-key.vercel.app";
const credFile = process.env.IRONKEY_CRED_FILE;
const [email, password] = fs.readFileSync(credFile, "utf8").split("\n").map((s) => s.trim());

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-color-profile=srgb", "--hide-scrollbars"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
    locale: "es-ES",
    colorScheme: "dark",
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  await page.waitForLoadState("networkidle").catch(() => {});

  const data = await page.evaluate(() => {
    const out = {};
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const byText = (sel, txt) => {
      const all = [...document.querySelectorAll(sel)].filter((e) => (e.innerText || "").trim().includes(txt));
      all.sort((a, b) => {
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        return ra.width * ra.height - rb.width * rb.height;
      });
      return all[0] || null;
    };

    // ancestro más pequeño que "parece" una tarjeta: ancho < 1800, alto < 700
    const cardOf = (txt) => {
      let el = byText("p,span,div,h2,h3,button", txt);
      if (!el) return null;
      let best = null;
      for (let i = 0; i < 8 && el; i++) {
        const r = el.getBoundingClientRect();
        const bg = getComputedStyle(el).backgroundColor;
        const solid = bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
        if (r.width < 1800 && r.height > 40 && r.height < 400) {
          best = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bg };
          if (solid) break;
        }
        el = el.parentElement;
      }
      return best;
    };

    out.genCard = cardOf("Tu contraseña generada");
    out.cfgCard = cardOf("Configuración de tu contraseña");
    out.netflixCard = cardOf("Título: Netflix");
    out.bancaCard = cardOf("Título: Banca personal");
    out.planCard = cardOf("Plan Free");
    const vault = byText("h2,h3", "Mis contraseñas guardadas");
    out.vaultHeading = box(vault);
    out.scrollH = document.body.scrollHeight;
    out.pageBg = getComputedStyle(document.body).backgroundColor;
    return out;
  });

  console.log(JSON.stringify(data, null, 1));
  await browser.close();
})();
