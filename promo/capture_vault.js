/**
 * Login + crea 2 contraseñas de ejemplo en el vault y captura el dashboard.
 * Requiere IRONKEY_CRED_FILE (archivo temporal chmod 600 con email y contraseña).
 * Títulos de ejemplo usados: "Netflix" y "Banca personal" (borrables desde la app).
 */
const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");

const OUT = path.join(__dirname, "out", "screen");
const CHROME = "/usr/bin/google-chrome";
const BASE = "https://iron-key.vercel.app";

const credFile = process.env.IRONKEY_CRED_FILE;
const [email, password] = fs.readFileSync(credFile, "utf8").split("\n").map((s) => s.trim());

const TITLES = ["Netflix", "Banca personal"];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-color-profile=srgb", "--hide-scrollbars"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 3,
    locale: "es-ES",
    colorScheme: "dark",
  });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3500);
  await page.waitForLoadState("networkidle").catch(() => {});
  console.log("login ok ->", page.url());

  // ¿El vault ya tiene contraseñas? Si no, creamos dos de ejemplo.
  const saved = await page.evaluate(() => document.body.innerText.includes("Mis contraseñas guardadas"));
  console.log("seccion vault presente:", saved);

  const countRows = () =>
    page.evaluate(() => {
      const m = document.body.innerText.match(/Contraseña guardada|Password/i);
      return m ? m.length : 0;
    });

  const existing = await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")];
    const del = btns.filter((b) => /eliminar|borrar/i.test(b.innerText || b.getAttribute("aria-label") || ""));
    return del.length;
  });
  console.log("botones de borrar (≈ contraseñas ya guardadas):", existing);

  if (existing < TITLES.length) {
    for (const title of TITLES) {
      await page.click('button:has-text("Guardar Contraseña")');
      await page.waitForTimeout(900);
      const dlg = await page.evaluate(() => {
        const inputs = [...document.querySelectorAll('[role="dialog"] input')].map((i) => ({
          type: i.type, ph: i.placeholder, name: i.name,
        }));
        const buttons = [...document.querySelectorAll('[role="dialog"] button')].map(
          (b) => (b.innerText || b.getAttribute("aria-label") || "").trim()
        );
        return { inputs, buttons };
      });
      console.log(`dialogo "${title}":`, JSON.stringify(dlg));
      const target = dlg.inputs.find((i) => i.type === "text") || dlg.inputs[0];
      if (!target) {
        console.log("sin input de texto en el dialogo, aborta");
        break;
      }
      const sel = `[role="dialog"] input[name="title"]`;
      await page.fill(sel, title);
      const ok = dlg.buttons.find((b) => /guardar|crear|confirm|aceptar/i.test(b));
      if (!ok) {
        console.log("sin boton de confirmar, botones:", dlg.buttons);
        break;
      }
      await page.click(`[role="dialog"] button:has-text("${ok}")`);
      await page.waitForTimeout(2500);
      console.log(`guardado: ${title}`);
    }
  }

  const after = await page.evaluate(
    () => [...document.querySelectorAll("button")].filter((b) => /eliminar|borrar/i.test(b.innerText || b.getAttribute("aria-label") || "")).length
  );
  console.log("contraseñas guardadas ahora:", after);

  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, "dashboard.png") });
  await page.screenshot({ path: path.join(OUT, "dashboard_full.png"), fullPage: true });
  console.log("capturado dashboard.png / dashboard_full.png");

  // Vista del vault, más abajo en la página
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "vault.png") });
  console.log("capturado vault.png");

  const mono = await page.evaluate(() =>
    [...document.querySelectorAll("p,span,div,code")]
      .filter((e) => getComputedStyle(e).fontFamily.match(/mono/i) && e.innerText && e.innerText.trim().length > 4)
      .map((e) => e.innerText.trim()).slice(0, 10)
  );
  console.log("contraseñas visibles:", JSON.stringify(mono));

  await browser.close();
})();
