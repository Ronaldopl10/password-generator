/**
 * Genera los "keyframes" del promo como composiciones HTML/CSS renderizadas por
 * Chrome (nítidas, sin IA, con el logo real de la app).
 * Salida: out/img/01_hook.png, 02_brand.png, 08_cta.png (3840x2160, dSF=2).
 */
const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");

const OUT = path.join(__dirname, "out", "img");
const CHROME = "/usr/bin/google-chrome";
const LOGO = path.join(__dirname, "..", "public", "ironkey-shield.svg");

// Colores extraídos del DOM real de iron-key.vercel.app (ver measure_pages.js)
const BG = "#0d1117";
const CARD = "#161b22";
const GOLD = "#a88144";
const GOLD_SOFT = "rgba(168,129,68,0.55)";
const TEXT = "#e6edf3";
const MUTED = "#8b949e";
const RED = "#f85149";

const logoSvg = fs.readFileSync(LOGO, "utf8");

const base = (extra) => `
<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1920px;height:1080px;background:${BG};color:${TEXT};
       font-family:'DejaVu Sans',system-ui,sans-serif;overflow:hidden;position:relative}
  .glow{position:absolute;inset:0;background:
       radial-gradient(900px 520px at 50% 42%, ${GOLD_SOFT}22, transparent 70%),
       radial-gradient(1400px 800px at 50% 120%, ${GOLD_SOFT}14, transparent 70%)}
  .grid{position:absolute;inset:0;opacity:.16;
       background-image:linear-gradient(${GOLD}22 1px,transparent 1px),
                        linear-gradient(90deg,${GOLD}22 1px,transparent 1px);
       background-size:120px 120px;
       -webkit-mask-image:radial-gradient(70% 60% at 50% 45%,#000 30%,transparent 75%)}
  .logo{position:absolute;filter:drop-shadow(0 0 46px ${GOLD_SOFT})}
  .logo svg{display:block}
  .mono{font-family:'DejaVu Sans Mono',monospace}
</style></head><body>
${extra}
</body></html>`;

const logoMarkup = (size, color, extraStyle = "") => `
  <div class="logo" style="width:${size}px;height:${size}px;color:${color};${extraStyle}">
    ${logoSvg.replace("<svg", '<svg width="100%" height="100%"')}
  </div>`;

// ---------------------------------------------------------------- 01 hook
const accounts = [
  { title: "Netflix", warn: true },
  { title: "Gmail", warn: false },
  { title: "Banco", warn: false },
];
const hook = base(`
  <div class="grid"></div><div class="glow"></div>
  <div style="position:absolute;top:118px;left:0;right:0;text-align:center">
    <div style="font-size:30px;color:${MUTED};letter-spacing:.18em;text-transform:uppercase">Cuentas de ejemplo</div>
  </div>
  <div style="position:absolute;top:236px;left:0;right:0;display:flex;gap:52px;justify-content:center">
    ${accounts
      .map(
        (a) => `
      <div style="width:460px;background:${CARD};border:1px solid ${a.warn ? "#7a4a2a" : "#21262d"};
                  border-radius:18px;padding:30px 34px 34px;position:relative">
        ${a.warn ? `<div style="position:absolute;top:-16px;right:22px;background:#3a2415;color:${GOLD};
                border:1px solid #7a4a2a;border-radius:999px;padding:5px 16px;font-size:19px;font-weight:700">reutilizada</div>` : ""}
        <div style="font-size:27px;color:${MUTED}">${a.title}</div>
        <div class="mono" style="font-size:40px;color:${a.warn ? GOLD : "#c9d1d9"};margin-top:14px;letter-spacing:.02em">Pass1234!</div>
        <div style="margin-top:22px;height:8px;border-radius:99px;background:${a.warn ? "#7a4a2a" : "#21262d"}"></div>
      </div>`
      )
      .join("")}
  </div>
  <div style="position:absolute;top:640px;left:0;right:0;text-align:center;font-size:34px;color:${MUTED}">
  </div>
  ${logoMarkup(128, GOLD, "left:100px;top:64px;")}`);

// ---------------------------------------------------------------- 02 brand
const brand = base(`
  <div class="grid"></div><div class="glow"></div>
  ${logoMarkup(430, GOLD, "left:50%;top:300px;transform:translateX(-50%)")}
  <div style="position:absolute;top:790px;left:0;right:0;text-align:center;font-size:52px;font-weight:400;letter-spacing:.02em">
    <span style="font-weight:400;color:${TEXT}">Iron</span><span style="font-weight:700;color:${GOLD}">Key</span>
  </div>`);

// ---------------------------------------------------------------- 08 cta
const cta = base(`
  <div class="glow" style="background:
       radial-gradient(760px 460px at 50% 38%, ${GOLD_SOFT}30, transparent 72%),
       radial-gradient(1200px 700px at 50% 100%, ${GOLD_SOFT}1e, transparent 72%)}"></div>
  ${logoMarkup(380, GOLD, "left:50%;top:290px;transform:translateX(-50%)")}
  <div style="position:absolute;top:700px;left:0;right:0;text-align:center">
    <div style="display:inline-block;background:${GOLD};color:#14181d;font-size:34px;font-weight:700;
                padding:20px 56px;border-radius:14px">Empezá gratis</div>
  </div>`);

const SCENES = [
  { name: "01_hook", html: hook },
  { name: "02_brand", html: brand },
  { name: "08_cta", html: cta },
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
  });
  for (const s of SCENES) {
    const page = await ctx.newPage();
    await page.setContent(s.html, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const file = path.join(OUT, `${s.name}.png`);
    await page.screenshot({ path: file });
    console.log("OK", path.basename(file), fs.statSync(file).size, "B");
    await page.close();
  }
  await browser.close();
})();
