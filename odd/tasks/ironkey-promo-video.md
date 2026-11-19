# IronKey — Vídeo promocional

## Specs

- S1: "quiero saber algo, mi plan suscripción de Minimax.io el MPlan ese tengo. ¿Podemos usarla para generar un vídeo?, Sería un vídeo 'publicitario' de la app" — fuente: conversación con el owner.
- S2: "no quería ... que el readme se vuelva vídeo, sino la info o el concepto, osea, el qué es la app y demás que ya explica o expone el readme, justo esa información convertirla en texto para generar el vídeo."
- S3: "yo tengo el plan Go de minimax ... No quiero usar api de pay as you go, sino el plan Go que ya tengo, en lo que más se pueda, así no tenga incluído el generador de vídeos como en los planes Explore o Build."
- S4: "la app ya no es password-generator.vercel.app sino que es https://iron-key.vercel.app/".
- S5: "Me gusta la primer y tercer opciones" — material: **Ruta A** (capturas reales + IA para lo abstracto) y **Ruta C** (clips que el owner genera en la web de Hailuo, integración opcional).

## Tasks

| ID | Spec | Ruta | Entregable | Commit |
|----|------|------|-----------|--------|
| T1 | S2,S4 | inline | Shot list + guion por planos, derivado de `README.md` (207 líneas, canónico en `origin/main`) → `promo/guion.md` | no commitear (artefacto) |
| T2 | S3 | inline | Clave de M Plan resuelta: `~/.gentle-shell/agent/auth.json` → `minimax.key` (`sk-cp-`, Subscription Key). Verificado: `image-01` ✅, `t2a_v2` ✅, `v2/video_generation` → 402 `insufficient_balance_error` (Go no cubre video), `/v1/music_generation` → 410 (retirada) | — |
| T3 | S3 | inline | ffmpeg para assembly: `ffmpeg-static` 7.0.2 (npm, dentro de `promo/`, sin sudo). El ffmpeg de Playwright es build `--disable-everything` (solo webm/VP9, sin audio ni filtros) → inservible. El de `ffmpeg-static` **no trae `drawtext`** → la tipografía va con libass (`.ass`) | — |
| T4 | S1,S2 | inline | Keyframes `image-01` 1920x1080 (4 keyframes) | — |
| T5 | S1,S2 | inline | Voz en off `speech-2.8-hd` voz `Spanish_CaptivatingStoryteller` speed 1.1 (7 tomas) | — |
| T6 | S1 | inline | Capturas reales de `iron-key.vercel.app` (`/register`, `/login`, `/pricing`) 1920x1080 dSF=2 vía `playwright-core` + Chrome del sistema | — |
| T7 | S1 | inline | Assembly ffmpeg: zoompan + vignette + libass + amix + loudnorm → `promo/out/promo.mp4` (45.0s) y `promo_9x16.mp4` | — |
| T8 | S5 | pendiente owner | Clips Hailuo del owner → slots reservados en el timeline (hook, transición, CTA) | — |
| T9 | S1 | inline | Plano 6 = tarjeta ámbar con la contraseña generada (recorte exacto del DOM, dSF=3). Plano 7 = vault con 2 entradas reales | — |
| T10 | S1 | pendiente owner | Corrección de copy en la app antes de publicar el vídeo: precios "Hasta 5/15" vs 18/40 reales, y `<title>` "Password Generator" → IronKey | — |

## Log

- L1: Petición original del owner: vídeo publicitario de la app (qué es, qué hace, para qué sirve) a partir de la información del README, usando su plan MiniMax M Plan Go, sin pay-as-you-go.
- L2: El owner clarification: no "convertir el README en vídeo" literalmente, sino convertir la información/contenido del README en el material del vídeo.
- L3: El owner	info: plan Go; 100% de la ventana de 5h y 66% de la semanal disponible. Prohibido usar API pay-as-you-go.
- L4: El owner纠正: dominio de producción = `https://iron-key.vercel.app/` (el repo/carpeta sigue como `password-generator`).
- L5: El owner eligió Ruta A + Ruta C.
- L6: Verificaciones empíricas (2026-11-17): `image-01` 200 con `sk-cp-`; `t2a_v2` 200 (MP3 real; ojo: `voice_id` inválido → 200 con audio de 0 bytes, hay que validar la voz); `v2/video_generation` 402 "The current Token Plan tier does not support this model"; `/v1/music_generation` 410 (API de música retirada para usuarios nuevos).
- L7: Decisión: promo = motion design sobre producto real (capturas + keyframes IA + voz + subtítulos). El modelo de video no aporta a un gestor de contraseñas y la UI nunca se renderiza bien en IA.
- L8: v0 ensamblada y verificada visualmente frame a frame: `promo/out/promo.mp4` (45.0s, 5.4 MB) + `promo_9x16.mp4`. Audio verificado por niveles (mean −19.4 dB, max −1.1 dB); la voz no se pudo escuchar (criterio del owner).
- L9: El owner hizo `git pull`: `README.md` canónico (207 líneas) ya está en el working tree; `origin/main` es la fuente de verdad del dominio (`iron-key.vercel.app`).
- L10: Hallazgo visible en el vídeo: la página `/pricing` muestra "Hasta 18 contraseñas" (encabezado) contra "Hasta 5 / Hasta 15" (bullets) → deuda #5 del README, queda expuesta en el plano 5. El `<title>` sigue siendo "Password Generator" (deuda #6).
- L11: El owner aportó las credenciales de la cuenta Admin de producción para capturar el dashboard. Login con Playwright + Chrome del sistema, capturas a `deviceScaleFactor: 3`, medición de bounding boxes por DOM (`measure_dashboard.js`) y recortes 1:1 en `build.py`. Se crearon 2 contraseñas de ejemplo en el vault ("Netflix", "Banca personal") para el plano del vault → borrables desde la app. Las credenciales se leen de un archivo temporal chmod 600 (`IRONKEY_CRED_FILE`), nunca al repo.
- L12: v1 final: 8 planos, 47.1s. Los planos 6 y 7 son producto real (no keyframes IA). Verificado frame a frame.
