# IronKey

Gestor de contraseñas con vault cifrado en servidor, cuenta de usuario y plan por suscripción. La contraseña se genera en el navegador, se guarda cifrada en la base de datos de la cuenta y se recupera desde cualquier sesión.

| | |
|---|---|
| Producción | <https://iron-key.vercel.app> |
| Código | <https://github.com/Ronaldopl10/password-generator> |

## Qué es

IronKey es una aplicación web que une un generador de contraseñas con un vault persistente ligado a una cuenta: cada usuario registrado tiene su propio espacio, genera una contraseña con los filtros que elija, la guarda bajo un título y la recupera descifrada desde el panel.

No es un generador suelto ni una extensión de navegador. Es un producto con cuentas, límites por plan, cobro por pasarela de pago y páginas legales propias.

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) + React 19 + TypeScript 5 |
| UI | Tailwind CSS 4 (tokens OKLCH) + shadcn/ui sobre Radix + `next-themes` + `lucide-react` |
| Datos | Prisma 6 + PostgreSQL (Neon en producción) |
| Autenticación | Auth.js v5 (Credentials + PrismaAdapter, sesiones JWT) + `bcryptjs` |
| Cifrado | `cryptr` (AES) con `ENCRYPTION_KEY` |
| Validación | Zod 4 + React Hook Form |
| Datos en cliente | TanStack React Query 5 |
| Avisos | Sonner |
| Email | Resend |
| Pagos | Mercado Pago (COP) + Dodo Payments (USD, pendiente de alta) |

## Para qué sirve

Resuelve el problema de la reutilización de contraseñas sin obligar a instalar nada. Un generador web suelto entrega la contraseña y la pierde; una extensión de navegador ata el vault a una máquina y no lo comparte. IronKey guarda cada contraseña en la cuenta del usuario, en la base de datos del servidor, con su título y los filtros con que se generó.

El propósito tiene dos caras:

- **Para quien lo usa**: un único lugar donde recuperar sus credenciales, accesible desde cualquier navegador donde inicie sesión, con límite de cuántas puede guardar según el plan.
- **Para quien lo opera**: un producto monetizable por suscripción, con planes sembrados en la base, checkout propio contra una pasarela de pago y las páginas legales que una pasarela internacional exige para operar.

## Cómo funciona

### Flujo principal

1. **Generar** — `lib/password.ts` arma el *pool* de caracteres según los filtros (longitud, mayúsculas, minúsculas, números y símbolos) y devuelve la contraseña. La interfaz de generación vive en `app/(dashboard)/_components/form-create-password.tsx`.
2. **Guardar** — `app/(dashboard)/_actions/create-password.action.ts` valida el formulario con Zod (`schema/password.schema.ts`), comprueba el límite del plan (`lib/validate-plan-limit.ts`), cifra con Cryptr y persiste en `Password` con su `userId`. El título es obligatorio y la contraseña mínima de 4 caracteres.
3. **Listar** — `app/(dashboard)/_actions/get-password.action.ts` devuelve solo las contraseñas del usuario autenticado, ordenadas por fecha de creación y descifradas para render. El cliente las pide con TanStack React Query.
4. **Copiar o borrar** — el portapapeles se escribe con `navigator.clipboard` y se confirma con un toast de Sonner; el borrado pide confirmación en `password-delete-dialog.tsx`.

### Autenticación y cifrado

Auth.js v5 (`next-auth` en beta) con provider **Credentials** y sesiones **JWT**:

- La contraseña de la cuenta se guarda hasheada con `bcryptjs` (12 rondas).
- `proxy.ts` es el middleware de Auth.js y corre en todas las rutas salvo `/api`, `_next/static`, `_next/image` y `favicon.ico`.
- Las Server Actions no confían en el middleware: validan la sesión con `requireAuth()` (`lib/get-session.ts`) y filtran siempre por `userId`.
- El registro asigna automáticamente el plan Free y redirige al login.

La recuperación de contraseña (`/forgot-password` → `/reset-password`) genera un token aleatorio de 32 bytes en `PasswordResetToken` con **1 hora** de expiración, envía el email con Resend (`lib/email.ts`), y al usarlo valida la expiración, hashea la nueva clave y borra el token en la misma transacción. La respuesta es genérica en ambos casos, para no revelar qué emails existen.

El cifrado en reposo lo hace `lib/cripto.ts` con Cryptr (AES) y `ENCRYPTION_KEY`: el resultado se guarda en `Password.encryptedPassword` y el texto plano nunca se escribe en la base. El descifrado ocurre en el servidor, en la acción que lista el vault.

### Planes y pagos

Los tres planes se siembran en la base (`prisma/seed.ts`) y `/pricing` los lee con `prisma.plan.findMany()`. El límite de guardado sale siempre de `Plan.maxPasswords` (`-1` = ilimitado), nunca de constantes en la UI:

| Plan | Límite de contraseñas | Precio en la base (USD) | Checkout |
|---|---|---|---|
| Free | 18 | 0 | — (plan por defecto al registrarse) |
| Starter | 40 | 2.99 | Mercado Pago, 12.600 COP/mes |
| Pro+ | ilimitado (`maxPasswords = -1`) | 9.99 | Mercado Pago, 41.960 COP/mes |

- **Mercado Pago (COP)**: `POST /api/mercadopago/create-preference` crea una *preapproval* recurrente. Los importes en COP están fijos en el código, equivalentes a los precios USD de la tabla.
- **Webhook**: `POST /api/webhooks/mercadopago` actualiza la `Subscription` cuando recibe un evento `preapproval` con estado `authorized`, usando `external_reference` (userId) y `reason` (nombre del plan).
- **Dodo Payments (USD)**: solo están los logos en `public/` y un aviso en `/pricing`. El checkout, la suscripción y su webhook están pendientes de que aprueben la cuenta.
- `POST /api/webhooks/lemonsqueezy` es una ruta muerta: el checkout de Lemon Squeezy se retiró y ya no se usa.

### Páginas legales

Las tres son públicas (no piden login) y están escritas en inglés, que es lo que revisan las pasarelas internacionales. El operador es la persona natural Ronaldo Pérez Lezama y la ley aplicable es la de Colombia.

| Ruta | Qué define |
|---|---|
| `/privacy` | Qué datos se guardan, quién los procesa, cuánto tiempo se retienen y por qué **no** hay cifrado de extremo a extremo |
| `/terms` | Plan, suscripción y renovación, cancelación, uso aceptable, límites de responsabilidad y ley aplicable |
| `/refund` | Cuándo aplica un reembolso, cómo se pide, que no hay reembolsos parciales y qué pasa con el vault al cancelar |

Contacto en las tres: `contacto@ronaldopl.com`.

### Qué garantiza y qué no

**Sí:**

- Cifrado AES en reposo en el servidor; el texto plano nunca se persiste.
- Aislamiento por `userId` en cada consulta, con `onDelete: Cascade` en la base.
- Hash de credenciales con bcrypt, 12 rondas.
- Tokens de reset aleatorios, de un solo uso y con expiración de 1 hora.
- El navegador nunca recibe `ENCRYPTION_KEY`.

**No:**

- **No es cifrado de extremo a extremo.** El servidor descifra para poder mostrar la contraseña en el panel. Si se pierde `ENCRYPTION_KEY`, las contraseñas guardadas son irrecuperables.
- **Cambiar la contraseña de la cuenta no invalida las sesiones JWT** emitidas antes: hay que cerrar sesión y volver a entrar.
- No hay verificación de email en el registro, ni segundo factor, ni borrado de cuenta desde la app (se solicita por email).

### Estructura del código

```
app/(auth)/      login, register, forgot/reset-password + sus Server Actions
app/(dashboard)/ generador, vault, acciones y componentes del panel
app/(legal)/     privacy, terms, refund (públicas, sin login)
app/pricing/     planes y checkout
app/api/         Auth.js, preapproval de Mercado Pago y webhooks
components/      UI (shadcn/ui) y componentes legales
lib/             cripto, prisma, generación, email, sesión y límite de plan
schema/          esquemas Zod (auth, password)
prisma/          schema.prisma, migraciones y seed
proxy.ts         middleware de Auth.js
```

Las capas van de arriba hacia abajo: **UI** (`components/`, `app/`) → **Server Actions** (`_actions/`) → **dominio** (`lib/`, `schema/`) → **Prisma** → PostgreSQL. La UI nunca toca Prisma directo.

### Limitaciones conocidas

1. **No hay runner de tests.** La verificación del proyecto es `npx tsc --noEmit` más revisión manual de rutas.
2. `generatePassword()` usa `Math.random()`, que no es criptográficamente seguro.
3. El webhook de Mercado Pago **no valida la firma `x-signature`**: la validación está comentada en el código.
4. `PasswordResetToken` **no tiene migración formal** en `prisma/migrations/`; en una base creada solo con `migrate deploy` esa tabla falta.
5. El checkout de Dodo Payments no está implementado (botón, suscripción y webhook).
6. `/api/webhooks/lemonsqueezy` quedó sin uso desde que se retiró ese checkout.
7. No hay búsqueda ni filtrado del vault, ni expiración de contraseñas (`expiresAt`).
8. `prisma/dev.db` es un resto de una versión SQLite anterior: el datasource actual es `postgresql`.

## Dónde se utiliza

En el navegador, desde escritorio o móvil, con una cuenta propia. El vault vive en el servidor, así que el mismo conjunto de credenciales se abre desde cualquier dispositivo donde se inicie sesión, y el panel muestra el uso del plan en una barra de progreso.

El escenario natural es personal o de equipo pequeño: recuperar credenciales sin depender de la memoria ni del gestor del sistema operativo. Queda fuera de su alcance todo lo que exige instalación o integración con el sistema: no hay app de escritorio ni móvil, no hay extensión del navegador, no hay autofill, no hay sincronización con gestores nativos y no hay segundo factor de autenticación. El servidor es el único punto de acceso.

El cobro está pensado para el mercado colombiano (Mercado Pago en pesos) y el internacional (Dodo Payments en dólares) está preparado pero no activo.

## Por qué existe

La necesidad que lo motiva es la reutilización de contraseñas: la misma clave termina en varios servicios, y basta una filtración ajena para perder varias cuentas a la vez. Un generador web resuelve la mitad del problema (crear una clave fuerte) y la otra mitad se pierde: la contraseña generada no queda en ningún lado. Las extensiones de navegador resuelven las dos, pero atan el vault a una máquina y no lo comparten entre dispositivos.

El valor que aporta IronKey es ese punto intermedio: el vault es del usuario y vive en su cuenta, no en un navegador ni en un archivo local. Sobre esa base el producto se diferencia en cuatro decisiones:

- **Los datos están en tu cuenta.** Cada fila de `Password` pertenece a un `userId`; nada se mezcla entre cuentas.
- **El cifrado es real y del lado del servidor.** AES con `ENCRYPTION_KEY`, con la limitación explícita de que no es cifrado de extremo a extremo.
- **El cobro es por plan.** El límite de contraseñas guardadas sale de la tabla `Plan`, y superarlo obliga a actualizar el plan.
- **El stack es propio.** Next.js, Prisma y PostgreSQL en Neon, con checkout propio contra una pasarela en lugar de depender del servicio de otro proveedor de contraseñas.

## Cómo utilizarlo

### Instalación

**Requisitos**: Node.js ≥ 20.9 (el proyecto se desarrolló con Node 24) y un PostgreSQL accesible (la misma base de Neon que usa producción sirve para desarrollo). Las credenciales de Mercado Pago y de Resend solo hacen falta para probar el checkout y la recuperación de contraseña.

```bash
npm install
npx prisma generate        # genera el cliente en generated/prisma
npx prisma migrate deploy # aplica las migraciones
npx prisma db seed        # crea los planes Free, Starter y Pro+
npm run dev               # http://localhost:3000
```

`.env` no se versiona (está en `.gitignore`) y tampoco hay un `.env.example` en el repositorio: hay que crearlo en la raíz con las variables de la tabla siguiente. En desarrollo, `npx prisma db push` es más rápido que `migrate deploy` y además crea la tabla `PasswordResetToken`, que no tiene migración.

### Variables de entorno

Las que el código lee explícitamente:

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Connection string de PostgreSQL (Prisma) |
| `AUTH_SECRET` | Firma de los JWT de sesión |
| `ENCRYPTION_KEY` | Clave AES con la que se cifran las contraseñas guardadas |
| `RESEND_API_KEY` | API key de Resend, para el email de recuperación |
| `APP_URL` | URL base para armar el enlace de reset (`NEXT_PUBLIC_APP_URL` es el fallback) |
| `MP_ACCESS_TOKEN` | Token de la API de Mercado Pago |
| `MP_BACK_URL` | URL HTTPS de retorno del checkout (Mercado Pago la exige) |

### Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con Turbopack |
| `npm run build` | `prisma generate && next build` |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | ESLint (`next lint`) |
| `npx prisma generate` | Genera el cliente en `generated/prisma` |
| `npx prisma migrate deploy` | Aplica las migraciones |
| `npx prisma db push` | Sincroniza el schema sin migraciones (desarrollo) |
| `npx prisma db seed` | Siembra los planes (`prisma/seed.ts`) |
| `npx tsc --noEmit` | Verificación de tipos |

`prisma/seed.ts` hace *upsert* de los tres planes por su `name` (`free`, `starter`, `pro`), con su `displayName`, su `maxPasswords` (18, 40 y `-1`) y su `price` (0, 2.99 y 9.99). El comando está declarado en `package.json` (`tsx prisma/seed.ts`).

### Deploy

Vercel, conectado al repositorio de GitHub, con deploy automático desde cada push.

- **Proyecto**: `password-generator`.
- **Producción**: <https://iron-key.vercel.app>.
- **`vercel.json`** fija `buildCommand` (`npm run build`), `outputDirectory` (`.next`) e `installCommand` (`npm install`).
- **Base de datos**: PostgreSQL en Neon.
- En el panel de Vercel hay que definir las mismas variables de entorno de la tabla anterior. Las migraciones se aplican con `prisma migrate deploy` contra Neon; la tabla `PasswordResetToken` hay que crearla aparte, porque no tiene migración versionada.

### Problema conocido: Turbopack y el workspace root

`npm run dev` falla en algunos equipos con `Can't resolve 'tailwindcss'`: Next infiere el *workspace root* en el directorio home (por un `package-lock.json` suelto en `/home/<usuario>`) y busca las dependencias ahí. Workarounds: correr `npx next dev --webpack` en lugar de `npm run dev`, o fijar el root en `next.config.ts` con `turbopack: { root: __dirname }`.

### Documentación del repo

| Ruta | Contenido |
|---|---|
| `AGENTS.md` | Reglas de trabajo del repo (uso del grafo de conocimiento) |
| `.github/copilot-instructions.md` | La misma guía, para GitHub Copilot |
| `odd/tasks/` | Especificaciones de trabajo por tarea (objetivo, specs, tareas y bitácora) |
| `promo/` | Pipeline del vídeo promocional: guion, capturas reales con Playwright y ensamblado con ffmpeg |

El grafo de conocimiento (`graphify-out/`) es local y **no está versionado**: se regenera con `graphify update .` y sirve para navegar el proyecto antes de tocarlo.

---

Desarrollado por Ronaldo Pérez Lezama.
