/**
 * Captura del dashboard logueado de iron-key.vercel.app.
 * NO guarda credenciales: las lee de un archivo temporal (chmod 600) que pasa
 * IRONKEY_CRED_FILE, con dos líneas: email y contraseña.
 */
const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");

const OUT = path.join(__dirname, "out", "screen");
const CHROME = "/usr/bin/google-chrome";
const BASE = "https://iron-key.vercel.app";

const credFile = process.env.IRONKEY_CRED_FILE;
if (!credFile || !fs.existsSync(credFile)) {
  console.error("FALLO: falta IRONKEY_CRED_FILE");
  process.exit(1);
}
const [email, password] = fs.readFileSync(credFile, "utf8").split("\n").map((s) => s.trim());

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
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

  console.log("URL tras login:", page.url());
  console.log("title:", await page.title());

  const file = path.join(OUT, "dashboard.png");
  await page.screenshot({ path: file });
  const full = path.join(OUT, "dashboard_full.png");
  await page.screenshot({ path: full, fullPage: true });
  console.log("capturado:", path.basename(file), fs.statSync(file).size, "B |", path.basename(full), fs.statSync(full).size, "B");

  // Inventario de la página para saber qué se puede capturar y cómo interactuar
  const info = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll("input")].map((i) => ({
      type: i.type, name: i.name, ph: i.placeholder, aria: i.getAttribute("aria-label"),
    }));
    const buttons = [...document.querySelectorAll("button")].map((b) => (b.innerText || "").trim()).filter(Boolean);
    const heads = [...document.querySelectorAll("h1,h2,h3")].map((h) => (h.innerText || "").trim()).filter(Boolean);
    const monos = [...document.querySelectorAll("p,span,div")]
      .filter((e) => getComputedStyle(e).fontFamily.match(/mono/i) && e.innerText && e.innerText.trim().length > 4)
      .map((e) => e.innerText.trim()).slice(0, 12);
    return { inputs, buttons, heads, monos, h: document.body.scrollHeight };
  });
  console.log("inputs:", JSON.stringify(info.inputs));
  console.log("botones:", JSON.stringify(info.buttons));
  console.log("headings:", JSON.stringify(info.heads));
  console.log("monoespaciados:", JSON.stringify(info.monos));
  console.log("altura pagina:", info.h);

  await browser.close();
})();
