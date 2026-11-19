/**
 * Captura de pantallas reales de iron-key.vercel.app con Chrome del sistema.
 * Sin descarga de browsers: usa /usr/bin/google-chrome vía playwright-core.
 */
const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");

const OUT = path.join(__dirname, "out", "screen");
const CHROME = "/usr/bin/google-chrome";
const BASE = "https://iron-key.vercel.app";

const TARGETS = [
  { name: "landing", url: BASE + "/" },
  { name: "register", url: BASE + "/register" },
  { name: "login", url: BASE + "/login" },
  { name: "pricing", url: BASE + "/pricing" },
];

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

  for (const t of TARGETS) {
    const page = await ctx.newPage();
    try {
      await page.goto(t.url, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(2000);
      const file = path.join(OUT, `${t.name}.png`);
      await page.screenshot({ path: file });
      const full = path.join(OUT, `${t.name}_full.png`);
      await page.screenshot({ path: full, fullPage: true });
      const title = await page.title();
      console.log(
        `OK ${t.name.padEnd(9)} viewport=${fs.statSync(file).size}B full=${fs.statSync(full).size}B title="${title}"`
      );
    } catch (e) {
      console.log(`FALLO ${t.name}: ${e.message.split("\n")[0]}`);
    }
    await page.close();
  }

  await browser.close();
})();
