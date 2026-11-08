# IronKey

**Gestor de contraseñas cifradas, en la web, con planes.** Generás contraseñas fuertes, las guardás cifradas con AES en tu cuenta, las recuperás cuando las necesitás y pagás por más espacio si lo requerís.

- **Producción**: https://iron-key.vercel.app
- **Repositorio**: https://github.com/Ronaldopl10/password-generator
- **Dominio propio**: `ironkey.dev` *(pendiente de compra)*

---

## Qué es

Una aplicación web de gestión de contraseñas con cuenta de usuario. Cada usuario registrado tiene su propio vault: genera contraseñas con los filtros que quiera, las guarda bajo un título, las ve cifradas en su panel, las copia al portapapeles y las elimina cuando quiere.

No es un generador de passwords suelto (eso hay en cada sitio) ni una extensión de navegador. Es un **producto con persistencia, límites por plan y cobro**.

## Por qué existe

Tres decisiones que definen el proyecto:

1. **El vault es del usuario, no del navegador.** Los passwords guardados viven en una base de datos con una fila por usuario (`Password.userId` con `onDelete: Cascade`). Nada se comparte entre cuentas.
2. **El cifrado es real, del lado del servidor.** Cada contraseña se guarda como `encryptedPassword` (AES vía Cryptr) usando `ENCRYPTION_KEY`. El servidor descifra para mostrarla y volver a cifrarla; el texto plano nunca se escribe en la base.
3. **Cobra en la moneda del usuario.** Mercado Pago en pesos colombianos para el mercado local y Lemon Squeezy en dólares para el resto. Los límites de guardado salen de la tabla `Plan`, no de constantes en el código.

## Cómo funciona

### Flujo principal

1. **Generar** — `lib/password.ts` arma el *pool* de caracteres según los filtros (longitud, mayúsculas, minúsculas, números, símbolos) y devuelve una contraseña.
2. **Guardar** — `app/(dashboard)/_actions/create-password.action.ts` valida con Zod, verifica el límite del plan (`lib/validate-plan-limit.ts`), cifra con Cryptr y persiste en `Password`.
3. **Listar** — `get-password.action.ts` devuelve solo las contraseñas del usuario autenticado, descifradas para render.
4. **Copiar / eliminar** — clipboard con feedback (Sonner) y `password-delete-dialog.tsx` para confirmar el borrado.

### Autenticación

Auth.js v5 (`next-auth` v5 beta) con **provider Credentials** y **sesiones JWT**:

- Contraseña de cuenta hasheada con `bcryptjs` (12 rondas).
- `proxy.ts` (Auth.js middleware) corre en todas las rutas salvo `/api`, `_next/static` y `_next/image`.
- Las Server Actions no confían en el proxy: validan sesión con `requireAuth()` (`lib/get-session.ts`) y filtran siempre por `userId`.

### Recuperación de contraseña

`forgot-password` → token aleatorio de 32 bytes en `PasswordResetToken` con expiración de **1 hora** → email vía **Resend** (`lib/email.ts`) → `reset-password?token=...` valida expiración, hashea la nueva clave y borra el token en la misma transacción.

El `from` actual es `IronKey <onboarding@resend.dev>` porque el dominio propio todavía no está verificado en Resend. Cuando se compre `ironkey.dev`, hay que verificarlo y cambiar esa dirección.

### Planes y pagos

Los tres planes se siembran en la base (`prisma/seed.ts`) y la página `/pricing` los lee con `prisma.plan.findMany()`:

| Plan | Límite de contraseñas guardadas | Precio seed | Precio en la UI |
|------|----------------------------------|-------------|-----------------|
| Free | 18 | 0 | 0 |
| Starter | 40 | 2.99 USD | 2.99 USD |
| Pro+ | ilimitado (`maxPasswords = -1`) | 9.99 USD | 9.99 USD |

- **Mercado Pago** (COP): `POST /api/mercadopago/create-preference` crea una *preapproval* con importes en centavos (`starter` 12600, `pro` 41960).
- **Lemon Squeezy** (USD): redirect al checkout del store con `checkout[email]` y `checkout[custom][user_id]`.
- **Webhooks**: `/api/webhooks/mercadopago` (eventos de suscripción) y `/api/webhooks/lemonsqueezy` (`x-lsz-event: order_created`) actualizan la `Subscription`.

> Los pagos están en **modo test**: las cuentas de Mercado Pago y Lemon Squeezy todavía no fueron aprobadas, así que la suscripción no se activa de verdad. Ver [Limitaciones conocidas](#limitaciones-conocidas-y-deuda-técnica).

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router, Server Actions) + React 19 + TypeScript 5 |
| UI | Tailwind CSS 4 (tokens OKLCH) + shadcn/ui sobre Radix + `next-themes` (tema claro/oscuro) + Lucide |
| Datos | Prisma 6 + PostgreSQL (Neon en producción) |
| Auth | Auth.js v5 (Credentials + PrismaAdapter, sesiones JWT) + `bcryptjs` |
| Cifrado | `cryptr` (AES) con `ENCRYPTION_KEY` |
| Validación | Zod 4 + React Hook Form |
| Datos cliente | TanStack React Query 5 |
| Notificaciones | Sonner (toasts) |
| Email | Resend |
| Pagos | Mercado Pago (COP) + Lemon Squeezy (USD) |

## Qué puede hacer el usuario

- Generar contraseñas con filtros de longitud y tipo de carácter.
- Guardarlas con un título descriptivo y recuperarlas cifradas.
- Copiar al portapapeles y eliminar con confirmación.
- Ver el uso del plan (barra de progreso) y hacer upgrade.
- Cambiar su contraseña con la actual (diálogo en el panel).
- Recuperar el acceso por email si se olvida la clave.
- Tema claro/oscuro persistente en toda la app.

## Arquitectura

```
app/
├── (auth)/          # login, register, forgot-password, reset-password + sus Server Actions
├── (dashboard)/     # panel: generador, vault, acciones y componentes de UI
├── pricing/         # planes + checkout
└── api/             # auth, mercadopago/create-preference, webhooks MP y LS
components/ui/       # shadcn/ui + botones de checkout
lib/                 # cripto, prisma, password, email, sesión, límite de plan
schema/              # esquemas Zod (auth, password)
prisma/              # schema.prisma, migraciones, seed
generated/prisma/    # cliente Prisma generado (no editar)
proxy.ts             # middleware de Auth.js
```

Capas: **UI** (`components/`, `app/`) → **Server Actions** (`_actions/`) → **dominio** (`lib/`, `schema/`) → **Prisma** → PostgreSQL. La UI nunca toca Prisma directo; las acciones validan con Zod y filtran por `userId` antes de escribir.

## Setup local

**Requisitos**: Node.js ≥ 20.9 (el proyecto se desarrolló con Node 24) y un PostgreSQL accesible (Neon sirve para desarrollo).

```bash
npm install
cp .env.example .env      # completar las variables (ver abajo)
npx prisma generate        # genera el cliente en generated/prisma
npx prisma migrate deploy # aplica el schema (o `npx prisma db push` en dev)
npx prisma db seed        # crea los planes Free / Starter / Pro+
npm run dev               # http://localhost:3000
```

Comandos disponibles: `npm run dev` · `npm run build` (`prisma generate && next build`) · `npm run start` · `npm run lint`.

> `prisma/dev.db` es un resto de la versión SQLite y no se usa: el provider actual es `postgresql`.

## Variables de entorno

Las que el código lee explícitamente:

| Variable | Para qué |
|----------|----------|
| `DATABASE_URL` | Connection string de PostgreSQL |
| `AUTH_SECRET` | Firma de los JWT de sesión |
| `ENCRYPTION_KEY` | Clave AES del cifrado de contraseñas |
| `RESEND_API_KEY` | API key de Resend (recuperación de contraseña) |
| `APP_URL` | URL base para armar el link de reset (`NEXT_PUBLIC_APP_URL` es fallback) |
| `MP_ACCESS_TOKEN` | Token de la API de Mercado Pago |
| `MP_BACK_URL` | URL HTTPS de retorno del checkout (MP la exige) |

El resto (credenciales de Lemon Squeezy, flags de Vercel) está en `.env.example` y en el panel de Vercel. `.env` nunca se versiona.

## Deploy

Vercel, connected al repo de GitHub (deploy automático en cada push a `main`).

- **Proyecto Vercel**: `password-generator` (cuenta `Ronaldopl10`)
- **Build command**: `npm run build` → `prisma generate && next build`
- **Framework preset**: Next.js
- **DB**: PostgreSQL en Neon
- **Config**: `vercel.json` fija build command, output directory e install command
- **Dominio actual**: `iron-key.vercel.app` (el viejo `password-gestor.vercel.app` redirige)

En Vercel hay que setear las mismas variables de entorno de la tabla anterior. Las migraciones se aplican con `prisma migrate deploy` en el build o de forma manual contra Neon.

## Seguridad: qué garantiza y qué no

**Sí:**
- Contraseñas de la base cifradas con AES; el texto plano no se persiste.
- Aislamiento por usuario: toda consulta filtra por `userId` (`onDelete: Cascade`).
- Hash de credenciales con bcrypt (12 rondas).
- Tokens de reset aleatorios (32 bytes) con expiración de 1 hora y de un solo uso.
- El cliente web nunca recibe `ENCRYPTION_KEY`.

**No:**
- **No es cifrado de extremo a extremo.** El servidor puede descifrar: es lo que permite mostrar la contraseña en el panel. Si se pierde `ENCRYPTION_KEY`, las contraseñas guardadas son irrecuperables.
- **Cambiar la contraseña no invalida las sesiones JWT emitidas antes.** Cerrar sesión y volver a entrar es el workaround actual.

## Limitaciones conocidas y deuda técnica

1. **No hay tests.** No hay runner instalado; el flujo SDD corrió en modo *Standard* (verificación por `tsc --noEmit` y revisión manual). Es la deuda más importante antes de refactorizar.
2. `generatePassword()` usa `Math.random()`, que no es criptográficamente seguro. Para un generador de uso personal es aceptable; para una app de passwords, `crypto.getRandomValues()` es lo correcto.
3. El webhook de Mercado Pago **no valida la firma `x-signature`** (la validación está comentada).
4. `PasswordResetToken` se aplicó en Neon con `prisma db push`: **no hay migración formal** en `prisma/migrations/` para ese modelo.
5. El copy de la página de precios dice "Hasta 5 / Hasta 15 contraseñas guardadas" mientras los límites reales del seed son **18 y 40**. Desincronizado.
6. `app/layout.tsx` todavía tiene `title: "Password Generator"` — debería decir IronKey.
7. Quedó el nombre viejo en dos lugares: las labels de Mercado Pago (`"PassGen Starter - $2.99 USD/mes"`) y el slug del store de Lemon Squeezy (`passgen.lemonsqueezy.com`).
8. No hay búsqueda ni filtrado del vault, ni expiración de contraseñas (`expiresAt`).

## Documentación del repo

| Ruta | Qué hay |
|------|---------|
| `MDs/PROJECT_CONTEXT_SNAPSHOT.md` | Contexto funcional del proyecto (**parcialmente desactualizado**) |
| `MDs/EVOLUTION_PLAN.md` | Plan por fases y hallazgos de arquitectura (fases 0-8) |
| `MDs/DEVELOPMENT.md` | Guía de desarrollo (**desactualizada**: describe la versión SQLite, sin auth) |
| `MDs/Guia_Promt.md` | Guía de prompts para trabajar sobre el proyecto |
| `openspec/sdd/auth-improvements/` | Artefactos SDD del último cambio (proposal, spec, design, tasks, verify-report) |
| `graphify-out/` | Grafo de conocimiento del proyecto (`GRAPH_REPORT.md` es el mapa) |

**Regla de trabajo con el grafo**: antes de tocar o preguntar por el código, leer `graphify-out/GRAPH_REPORT.md`. Después de modificar código, correr `graphify update .` para refrescarlo (no cuesta API).

## Roadmap

Corto plazo:
- [ ] Comprar `ironkey.dev` y verificarlo en Resend (cambiar el `from` del email).
- [ ] Aprobación de las cuentas de Mercado Pago y Lemon Squeezy → credenciales de producción.
- [ ] Corregir el copy de precios (5/15 → 18/40) y el `title` del layout.
- [ ] Migración formal de `PasswordResetToken`.
- [ ] Buscar/filtrar contraseñas y expiración (`expiresAt`).

Medio plazo:
- [ ] Suite de tests (empezando por `lib/password.ts` y `validate-plan-limit.ts`).
- [ ] Invalidar sesiones al cambiar la contraseña.
- [ ] `crypto.getRandomValues()` en el generador y validación de firma en el webhook de MP.
- [ ] Migración del slug de Lemon Squeezy a la marca.

---

Desarrollado por **Ronaldopl10**. MIT.
