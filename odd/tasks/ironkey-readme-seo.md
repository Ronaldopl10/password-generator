# IronKey — README profesional + pase de SEO técnico

Dos entregables independientes sobre la rama `feat/seo-and-readme` (desde `main` post-merge de PR #10):
reescribir el README con la estructura pedida por el owner, y un pase de SEO técnico en el sitio.

## Specs

### S1 — Objetivo del README (texto del owner, verbatim)

> El objetivo es que cualquier persona que abra el repositorio y lea únicamente el README pueda comprender, con total claridad y sin necesidad de explorar el código:
>
> - Qué es: qué tipo de proyecto es y cuál es su naturaleza.
> - Para qué sirve: qué problema resuelve y cuál es su propósito.
> - Cómo funciona: cómo está construido, cuáles son sus componentes principales y cómo interactúan.
> - Dónde se utiliza: en qué contexto, entorno o escenario tiene sentido.
> - Por qué existe: qué necesidad lo motiva, qué valor aporta y qué lo diferencia.
> - Cómo utilizarlo: qué se necesita para instalarlo, configurarlo, ejecutarlo y comenzar a trabajar con él.

### S2 — Investigar antes de escribir (verbatim)

> Antes de escribir, investigá el proyecto. Analizá su estructura de directorios, archivos importantes, tecnologías, dependencias, configuraciones, funcionalidades e implementaciones reales. Utilizá el código como fuente de verdad: no inventes características, capacidades, decisiones arquitectónicas ni instrucciones que no estén respaldadas por el proyecto.

### S3 — Criterios de calidad (verbatim)

> Claridad absoluta: alguien que nunca vio el proyecto debe entenderlo rápidamente.
> Contenido sustancial: cada sección debe aportar información útil y concreta. Evitá frases genéricas, relleno y explicaciones redundantes.
> Brevedad inteligente: no quiero un README interminable. Quiero la máxima cantidad de información relevante con la menor cantidad de texto posible.
> Estructura profesional: organizá el contenido con títulos, subtítulos, listas, tablas o diagramas cuando realmente ayuden a comprender el proyecto.
> Precisión técnica: documentá únicamente lo que exista y pueda verificarse en el repositorio.
> Identidad del proyecto: el README debe transmitir claramente la esencia, el propósito y el alcance del proyecto, no limitarse a describir tecnologías.
> Experiencia de lectura: priorizá la información más importante al principio y permití que el lector encuentre rápidamente lo que necesita.

### S4 — Resultado esperado (verbatim)

> Quiero un README profesional, moderno, conciso, completo y bien estructurado.
> No quiero una documentación extensa que explique cada archivo ni un README genérico que podría pertenecer a cualquier repositorio.
> Quiero que sea una presentación integral del proyecto: que permita entender qué es, por qué existe, qué hace, cómo está construido y cómo ponerlo en funcionamiento con una sola lectura.

### S5 — Conservar lo que sigue siendo correcto (verbatim)

> Trabajá directamente sobre el README.md existente. Conservá únicamente aquello que siga siendo correcto y relevante, corregí lo que esté desactualizado y reemplazá o reorganizá lo que sea necesario.

### S6 — Verificación final (verbatim)

> Al finalizar, verificá que todos los comandos, rutas, nombres, dependencias e instrucciones documentados coincidan con el estado real del proyecto.

### S7 — SEO

> mejorá el SEO

Alcance acordado (técnico, en el sitio, sin rediseño de UI ni de producto):
metadata del root y por ruta, `metadataBase`, Open Graph, Twitter card, canonical, robots, `app/sitemap.ts`,
`app/robots.ts`, `noindex` en las rutas de autenticación, JSON-LD (WebSite / Organization / SoftwareApplication
con las ofertas reales de los planes) y `lang="en"` en el contenido de las páginas legales en inglés.

### S8 — Idioma

El README va en **español**: es la convención del repo (UI, docs y commits ya están en español) y el owner lo pidió así.
Las páginas legales(`/privacy`, `/terms`, `/refund`) siguen en **inglés** (las revisan pasarelas internacionales).

### S9 — Reglas de git y entorno

- **No commitear, no pushear, no crear PR**: el owner maneja el git.
- **No tocar `.env*`** ni leerlos.
- No tocar la base real.
- Todo cambio de código cierra con `Risk: item N (razón)` o `Risk: none`.

## Tasks

| ID | Specs | Ruta | Descripción | Archivo | Commit |
|----|-------|------|-------------|---------|--------|
| T1 | S1, S3, S4, S5, S6, S8 | `gentle-ai-worker` | Reescribir `README.md` con las 6 secciones pedidas + portada, conservando lo que sigue siendo cierto y descartando lo desactualizado | `README.md` | pendiente del owner |
| T2 | S7 | `gentle-ai-worker` | Metadata raíz y por ruta: `metadataBase`, template de title, description, OG, Twitter, canonical, robots | `app/layout.tsx`, `app/(dashboard)/page.tsx`, `app/pricing/page.tsx`, `app/(legal)/*/page.tsx`, `app/(auth)/layout.tsx` | pendiente del owner |
| T3 | S7 | `gentle-ai-worker` | Descubribilidad: `app/sitemap.ts`, `app/robots.ts`, `noindex` de las rutas de auth | `app/sitemap.ts`, `app/robots.ts`, `app/(auth)/layout.tsx` | pendiente del owner |
| T4 | S7 | `gentle-ai-worker` | Datos estructurados JSON-LD + `lang="en"` en el contenido legal | `lib/seo.ts` (nuevo), `components/legal/legal-document.tsx`, `app/(legal)/layout.tsx`, `app/pricing/page.tsx` | pendiente del owner |
| T5 | S1, S6 | padre | Verificación final: `tsc --noEmit`, rutas nuevas, contraste de cada afirmación del README contra el código | — | — |
| T4b | S7 | padre | Imagen social 1200x630: la convención `app/opengraph-image.tsx` no se mergea en el `openGraph` exportado por las rutas, así que se renderiza a `public/og-image.png` y se referencia desde `lib/seo.ts` | `app/opengraph-image.tsx` (nuevo), `public/og-image.png` (nuevo), `lib/seo.ts` | pendiente del owner |

## Log

- **L1** (owner, 2026-11-19, verbatim): "continuemos. mejorá el SEO y para el md seguí esto: Actualizá y mejorá integralmente el README.md de este proyecto. El objetivo es que cualquier persona que abra el repositorio y lea únicamente el README pueda comprender, con total claridad y sin necesidad de explorar el código: Qué es / Para qué sirve / Cómo funciona / Dónde se utiliza / Por qué existe / Cómo utilizarlo. Antes de escribir, investigá el proyecto. Analizá su estructura de directorios, archivos importantes, tecnologías, dependencias, configuraciones, funcionalidades e implementaciones reales. Utilizá el código como fuente de verdad: no inventes características, capacidades, decisiones arquitectónicas ni instrucciones que no estén respaldadas por el proyecto. Criterios de calidad: Claridad absoluta / Contenido sustancial / Brevedad inteligente / Estructura profesional / Precisión técnica / Identidad del proyecto / Experiencia de lectura. Resultado esperado: Quiero un README profesional, moderno, conciso, completo y bien estructurado. No quiero una documentación extensa que explique cada archivo ni un README genérico que podría pertenecer a cualquier repositorio. Quiero que sea una presentación integral del proyecto: que permita entender qué es, por qué existe, qué hace, cómo está construido y cómo ponerlo en funcionamiento con una sola lectura. Trabajá directamente sobre el README.md existente. Conservá únicamente aquello que siga siendo correcto y relevante, corregí lo que esté desactualizado y reemplazá o reorganizá lo que sea necesario. Al finalizar, verificá que todos los comandos, rutas, nombres, dependencias e instrucciones documentados coincidan con el estado real del proyecto."
- **L2** (owner, 2026-11-19): el PR #10 ya fue mergeado a `main`; este trabajo arranca en la rama `feat/seo-and-readme`.
- **L3** (padre, 2026-11-19): verificado con `git ls-files` que `MDs/`, `openspec/`, `.opencode/` y `graphify-out/` **no** están versionados (0 archivos): la tabla "Documentación del repo" del README actual está desactualizada y hay que corregirla. Trackeados: `odd/` (1 archivo) y `promo/` (11 archivos).
- **L4** (padre, 2026-11-19): `npm run dev` es `next dev --turbopack`, y en la máquina del owner **falla** (`Can't resolve 'tailwindcss'`) porque Next infiere el workspace root en `/home/ronaldo` por un `package-lock.json` suelto ahí. Workaround conocido: `npx next dev --webpack`, o fijar `turbopack.root` en `next.config.ts`. Documentarlo como nota de troubleshooting.
- **L5** (padre, 2026-11-19): el build de Vercel es `prisma generate && next build`; el sitio de producción es `https://iron-key.vercel.app`.
- **L6** (padre, 2026-11-19, T4b): la convención de archivo `app/opengraph-image.tsx` **no** se mergea dentro de un objeto `openGraph` exportado por una ruta: la imagen solo apareció en `/login` (la única ruta sin `openGraph` propio) y faltó en `/`, `/pricing`, `/privacy`, `/terms` y `/refund`. Solución: renderizar la imagen a `public/og-image.png` (1200x630) y referenciarla explícitamente desde `lib/seo.ts` (`SITE_OG_IMAGE_URL`) en `openGraph.images` y `twitter.images`. `app/opengraph-image.tsx` queda como fuente del diseño para regenerarla.
- **L7** (padre, 2026-11-19, T5): verificado contra el **build de producción** con `next start` (no dev): las 8 rutas probadas devuelven 200; `og:image` y `twitter:image` = `https://iron-key.vercel.app/og-image.png` en todas; canonical correcto por ruta; `robots=index, follow` en las públicas y `noindex, nofollow` en `/login`, `/register`, `/forgot-password`; JSON-LD `WebSite` + `Organization` en todas y `SoftwareApplication` con `AggregateOffer` (precios reales de la DB) en `/pricing`; `<article lang="en">` en las páginas legales; `/sitemap.xml` con las 5 URLs y `/robots.txt` con `Allow: /`, `Disallow: /api/` y la URL del sitemap. `npm run build` → exit 0 y `npx tsc --noEmit` → exit 0.
- **L8** (padre, 2026-11-19): `SITE_URL` se deriva de `NEXT_PUBLIC_APP_URL` → `APP_URL` → fallback `https://iron-key.vercel.app`. En el build local resolvió al dominio de producción, así que los canonical apuntan bien; si el owner compra `ironkey.dev` hay que cambiar el fallback de `lib/seo.ts` o setear `NEXT_PUBLIC_APP_URL` en Vercel.
