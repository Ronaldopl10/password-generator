# IronKey — Guion y shot list del vídeo promocional

**Estado:** v2 ensamblada ✅ · **50.6s** · 1920x1080 @30fps · `promo/out/promo.mp4` (+ `promo_9x16.mp4`)
**Paleta (tomada del DOM real de la app):** fondo `#0d1117`, tarjeta `#161b22`, **oro de marca `#a88144`**, texto `#e6edf3`, secundario `#8b949e`
**Tipografía:** DejaVu Sans vía libass (`.ass`) — el build de ffmpeg no trae `drawtext`

## Planos

| # | Tipo | Dur | Visual | Pantalla | Título | VO (español neutro, sin voseo) |
|---|------|-----|--------|----------|--------|------|
| 1 | composición HTML | 6.7s | Logo real de la app + 3 cuentas con la **misma** contraseña, una marcada "reutilizada" | `out/img/01_hook.png` | `La misma contraseña` / `en todas tus cuentas` | "Usas la misma contraseña en todas tus cuentas. Eso quiere un atacante." |
| 2 | composición HTML | 6.1s | Logo shield+llave grande + wordmark "Iron**Key**" | `out/img/02_brand.png` | `Gestor de contraseñas cifradas` / `En la web, con planes` | "IronKey: un gestor de contraseñas cifradas, con planes." |
| 3 | captura real | 5.4s | Formulario "Crear cuenta" (recorte 1:1) | `out/screen/register.png` | `Tu cuenta, en 30 segundos` / `Registro con email y contraseña` | "Te registras con un email y una contraseña." |
| 4 | captura real | 8.7s | Formulario "Iniciar sesión" (recorte 1:1) | `out/screen/login.png` | `Cifrado con AES` / `En tu cuenta, no en tu navegador` | "Lo que guardas queda cifrado con AES. El texto plano nunca se escribe." |
| 5 | captura real | 7.1s | Las 3 tarjetas de plan (recorte **sin** los botones de pago) | `out/screen/pricing.png` | `Tres planes` / `Free, Starter o Pro+` | "Free, Starter o Pro+. Si llegaste al límite, subes de plan y sigues." |
| 6 | captura real | 4.5s | Tarjeta ámbar con la contraseña generada (hero) | `out/screen/dashboard.png` | `Generá con tus filtros` / `Mayúsculas, minúsculas, números, símbolos` | "Generas la contraseña con los filtros que quieras." |
| 7 | captura real | 5.8s | Vault con 2 entradas + tags + Copiar/Eliminar | `out/screen/vault.png` | `Guardá y recuperá` / `Tu vault es sólo tuyo` | "La guardas con un título y la recuperas cifrada cuando la necesitas." |
| 8 | composición HTML | 6.2s | Logo + botón "Empezá gratis" | `out/img/08_cta.png` | `iron-key.vercel.app` / `Tus contraseñas seguras` | "IronKey. Tus contraseñas seguras." |

> Los planos 1, 2 y 8 **no usan IA**: son composiciones HTML/CSS renderizadas por Chrome con el SVG real de la app (`public/ironkey-shield.svg`). Vectoriales ⇒ nítidas a cualquier escala.

## Recortes (px de dispositivo) y nitidez

| Plano | Origen | dSF | Recorte (x,y,w,h) | Resultado |
|-------|--------|-----|--------------------|-----------|
| 3 | register.png | 2 | `1472,632,896,1000` | tarjeta 1:1, escala 0.9× del CSS → sin blur |
| 4 | login.png | 2 | `1472,740,896,784` | ídem |
| 5 | pricing.png | 2 | `1000,470,1920,880` | 3 tarjetas, sin botones de pago |
| 6 | dashboard.png | 3 | `1900,360,1960,370` | tarjeta ámbar 1:1 |
| 7 | vault.png | 3 | `1960,2490,1840,1070` | 2 entradas 1:1 |

Reglas: `crop` → `scale=1920:<h>:force_original_aspect_ratio=decrease` → `pad=1920:1080:-1:<y>` (banda de texto libre abajo) → `zoompan` con zoom máximo **1.03** (3% de upscale, imperceptible) → `noise=alls=1.6` (grano que mata el banding de los degradados oscuros).

## Voz

- Modelo `speech-2.8-hd`, voz por defecto `Spanish_Narrator`, `speed 1.06`.
- `language_boost: "Spanish"` + `text_normalization_mode: "quality"` + `pronunciation_dict` para "IronKey" (IPA) → es lo que quita el "tono.robotizado" y la cadencia rioplatense.
- **El texto está escrito en español neutro (tú, sin voseo)**: el voseo ("generás", "guardás") es lo que hacía que el modelo leyera con acento rioplatense.
- Audición: `python3 build.py audition` → `out/audition/audicion.mp3` con 4 voces ES en orden (Narrator, SophisticatedLady, ReservedYoungMan, ConfidentWoman). Para cambiar: `VOICE = "..."` en `build.py` y re-render.

## Pendientes

1. **Copy contradictorio en el plano 5**: "Hasta 18 contraseñas" vs "Hasta 5 / Hasta 15 guardadas" (deuda #5 del README). Ahora se ve más claro porque el recorte enlarge las tarjetas.
2. **Lemon Squeezy**: el recorte del plano 5 excluye los botones de pago, así que el vídeo no anuncia un proveedor que no le aprobaron. Cuando defina el sustituto (Paddle, Stripe, PayPal, o seguir con Mercado Pago para LatAm) hay que recapturar esa escena.
3. `<title>` sigue siendo "Password Generator" (deuda #6) — no afecta al vídeo.
4. Clips Hailuo del owner (opcional): hook, transición a cifrado, CTA. Sin texto, sin UI, 16:9.

## Producción

- **Sin modelo de vídeo**: el plan Go responde 402 `The current Token Plan tier does not support this model`.
- **Música**: pad ambiental sintetizado con numpy (sin copyright) a −21 dB bajo la voz; mezcla `loudnorm=I=-16:TP=-1.5` → master mean −19.5 dB, max −1.4 dB.
- **Reconstruir**: `python3 build.py all` (idempotente, cachea por archivo). Pasos: `node render_frames.js` → `node capture.js` → `node capture_vault.js` → `node measure_pages.js` → `python3 build.py all`.
- **Credenciales**: `capture_vault.js` y `measure_dashboard.js` leen email y contraseña de un archivo temporal 600 que define `IRONKEY_CRED_FILE`. Nunca al repo.
