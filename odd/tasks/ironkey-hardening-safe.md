# IronKey — endurecimiento seguro (sin tocar datos de producción)

Lote acotado a la columna "sin riesgo" que el owner aprobó el 2026-11-19, con la base real ya respaldada.
Producción tiene **usuarios reales con contraseñas reales**: la base, el cifrado, el auth y Mercado Pago
**no se tocan**. Ver `prod/ironkey-live-data` en Engram.

## Specs

### S1 — Backup verificado antes de tocar nada (verbatim del owner)

> pero antes haz backup de la bd y de el proyecto (si es necesario o aplica)

Estado: **hecho por el padre** (no es tarea del worker).
- Dump: `backups/ironkey-20261119-040850.sql` (20.781 bytes), generado con `pg_dump` 17.11 desde la imagen
  `public.ecr.aws/supabase/postgres:17.11.0.006` (el `pg_dump` local es 16 y el server de Neon es 17 → mismatch).
- Verificado por conteos: dump = base real (User 5, Password 19, Plan 3, Subscription 5, PasswordResetToken 5).
- Verificado por restauración: restaurado en un Postgres 17 limpio con **cero errores**, mismos conteos y
  **0 contraseñas huérfanas**.
- `backups/` está en `.gitignore` (verificado con `git check-ignore`). Contiene datos cifrados y emails: no commitear.
- Proyecto: todo commiteado y pusheado; `origin/main` contiene el PR #11 mergeado.

### S2 — Generador con CSPRNG

`lib/password.ts` usa `Math.random()`, que no es criptográficamente seguro. Para un gestor de contraseñas es la
promesa central del producto y hoy no se cumple. Debe usar `crypto.getRandomValues()` con **rechazo** para evitar
sesgo de módulo (descartar valores >= floor(2^32 / pool) * pool). El global `crypto` existe en navegador y en Node 18+,
así que sirve para cliente y servidor. Fallback: si `crypto.getRandomValues` no existiera, fallar explícitamente
(no volver a `Math.random`).

### S3 — Runner de tests y primeros casos

El repo no tiene runner: la verificación es `tsc --noEmit` + revisión manual. Instalar **Vitest** y cubrir:
- `lib/password.ts`: largo exacto; solo caracteres de los pools habilitados; config vacía → fallback a minúsculas;
  y el caso clave: **el generador usa un CSPRNG** (RED antes del fix, GREEN después).
- `lib/validate-plan-limit.ts`: con Prisma mockeado (`vi.mock("@/lib/prisma")`): plan `-1` (ilimitado) no tira;
  `count < max` no tira; `count >= max` tira con el mensaje del límite; sin suscripción tira "Sin plan asignado".
  El archivo tiene `"use server"` arriba: en Vitest esa directiva es inerte, no romper nada.

### S4 — Código muerto

Borrar `app/api/webhooks/lemonsqueezy/route.ts` (ruta muerta: se retiró el checkout de Lemon Squeezy, la tienda nunca
fue aprobada, no hay eventos) y `prisma/dev.db` (resto de una versión SQLite; el datasource actual es `postgresql`).
No tocar NADA de Mercado Pago.

### S5 — README al día

Reflejar en `README.md`: el runner y el comando `npm test` (tabla de comandos), el generador con CSPRNG en
"Qué garantiza y qué no", el árbol de directorios con los tests, y **eliminar de "Limitaciones conocidas"** los ítems
resueltos (sin runner de tests, `Math.random()`, webhook de Lemon, `prisma/dev.db`).

### S9 — Reglas de seguridad de este lote

- **No tocar**: la base real (ni `prisma migrate`, ni `prisma db push`, ni escrituras), `lib/cripto.ts`,
  `ENCRYPTION_KEY`, `auth.ts`, `auth.config.ts`, `proxy.ts`, las acciones de auth, `app/api/webhooks/mercadopago/**`,
  `app/api/mercadopago/**`.
- **No tocar** `.env*` ni leerlos. **No correr** `npm run dev`, `next dev`, `next start` ni `npm run build` (el padre
  los corre en serie).
- Los tests **no** pueden tocar la base: Prisma va mockeado.
- No commitear ni pushear: el owner maneja git.

## Tasks

| ID | Specs | Ruta | Descripción | Archivos | Commit |
|----|-------|------|-------------|----------|--------|
| T1 | S2, S3 | `gentle-ai-worker` | CSPRNG en `lib/password.ts` + Vitest + tests de `lib/password.ts` y `lib/validate-plan-limit.ts` (RED → GREEN) | `lib/password.ts`, `lib/password.test.ts`, `lib/validate-plan-limit.test.ts`, `vitest.config.ts`, `package.json`, `package-lock.json` | pendiente del owner |
| T2 | S4 | `gentle-ai-worker` | Borrar el webhook muerto de Lemon y `prisma/dev.db` | `app/api/webhooks/lemonsqueezy/route.ts`, `prisma/dev.db` | pendiente del owner |
| T3 | S5 | `gentle-ai-worker` | Actualizar el README con lo resuelto | `README.md` | pendiente del owner |
| T4 | S1, S9 | padre | Verificación: `npm test` en verde, `tsc --noEmit`, build de producción, y confirmar que la base real no cambió (conteos antes/después) | — | — |

## Resultado

**T4 (verificación del padre, 2026-11-19)** — todo en verde y base real intacta:

| Chequeo | Resultado |
|---|---|
| `npm test` | **16 tests, 2 archivos, 492 ms, exit 0** (`lib/password.test.ts` 10, `lib/validate-plan-limit.test.ts` 6) |
| `npx tsc --noEmit` | exit 0, sin output |
| `npm run build` | exit 0; la ruta `/api/webhooks/lemonsqueezy` ya no aparece en el manifiesto (17 rutas) |
| Base real (solo lectura) | conteos **idénticos** al backup: User 5, Password 19, Plan 3, Subscription 5, PasswordResetToken 5 |
| Prueba de no escritura | `max("Password"."updatedAt")` = `2026-11-18 08:05:18`, **anterior a esta sesión** → nada se escribió |
| `backups/` | sigue ignorado por git (`git check-ignore`) |
| `.next/types/` | regenerado por el build ✓ |

**RED → GREEN (worker)**: antes del fix fallaban 2 tests (`usa crypto.getRandomValues y no Math.random` y `falla explícitamente cuando crypto.getRandomValues no está disponible`); después, 16/16 en verde.

**Decisiones que dejó el worker y se aceptaron**:
- `vitest@^3.2.7` en vez de la última: vitest 5 exige `@types/node ^22 || >=24` y el proyecto tiene `@types/node@20` → `ERESOLVE`. Subir `@types/node` es un cambio de dependencias no autorizado.
- El worker borró del README el bullet que decía que `/api/webhooks/lemonsqueezy` era una ruta muerta, porque tras T2 esa ruta ya no existe: si se dejaba, el README afirmaba algo falso.
- Borró dos stubs de tipos generados en `.next/` (cache gitignorada) que seguían importando la ruta eliminada y rompían el type-check; el build los regenera ✓.

## Log

- **L1** (owner, 2026-11-19, verbatim): "Esa tabla me parece bien. así qu esi estas 100% seguro que lo que está en la parte de sin riesgo no tiene riesgo alguno hazlos, pero antes haz backup de la bd y de el proyecto (si es necesario o aplica)".
- **L2** (owner, 2026-11-19, verbatim): "Ya hice el push [...] y el pr y merge. Sí al mandar la url por red social sale una imagen con logo y demás."
- **L3** (padre, 2026-11-19): **el `.env` local apunta a la base de producción de Neon** (`ep-dawn-pine-amvoqs9m-pooler.c-5.us-east-1.aws.neon.tech`). El README dice "la misma base de Neon que usa producción sirve para desarrollo": cualquier `npm run dev` local escribe contra datos reales. No cambiar esto en este lote (requiere decisión del owner), pero queda anotado como riesgo.
- **L4** (padre, 2026-11-19): backup verificado (dump + restauración limpia sin errores + conteos idénticos + 0 huérfanas). `backups/` ignorado por git.
- **L5** (padre, 2026-11-19): el dump incluye `CREATE SCHEMA public`, que falla al restaurar con un usuario que no es dueño del schema (caso de la imagen de Supabase). Restaurar como superusuario y/o en una base nueva.
- **L6** (padre, 2026-11-19): verificación final del lote → 16 tests en verde, `tsc` exit 0, build exit 0, conteos de la base real idénticos al backup y `max("Password"."updatedAt")` anterior a la sesión (nada escrito). Detalle en "Resultado".
- **L7** (padre, 2026-11-19): con el generador en CSPRNG, `generatePassword` **falla explícitamente** si `crypto.getRandomValues` no existe (en vez de generar contraseñas débiles). Es el comportamiento correcto para un password manager, pero es un cambio observable: Web Crypto no existe en navegadores muy viejos (IE11). Cubierto por tests.
- **L8** (padre, 2026-11-19, cierre de sesión): todo mergeado y en producción (PR #11 SEO, PR #12 endurecimiento). Verificado contra `https://iron-key.vercel.app`: las 7 rutas públicas responden 200, el bundle servido contiene `getRandomValues` (CSPRNG live), `title` y `canonical` correctos. `main` local sincronizado en `67d5766`. Sin procesos ni contenedores de prueba colgando. El dump de la base vive **solo** en el disco local (`backups/`, ignorado por git): el owner debe copiarlo fuera de la máquina.
- **L9** (padre, 2026-11-19): pendientes que quedan **congelados por decisión del owner**: (a) toda la integración de Mercado Pago hasta que se cierre el caso abierto con ellos; (b) la migración de `PasswordResetToken` (toca el schema de producción); (c) la verificación de email en el registro (toca cuentas existentes). Pendiente de decisión, no bloqueado: **comprar el dominio** y **separar la base de desarrollo de la de producción** (el `.env` local apunta a la base real de Neon).
