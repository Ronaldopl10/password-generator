# Iron Key — cobros con Dodo Payments (checkout + webhook + provisión)

Integración de Dodo Payments (merchant of record) en Iron Key: checkout, webhook firmado, provisión de plan y cola de eventos. Primero test mode con compra de prueba end-to-end, después live mode. Mercado Pago queda congelado y sin tocar.

## Specs

**S1.** El checkout de Dodo se suma al sitio; el botón de Mercado Pago no se modifica ni se reemplaza.

**S2.** "integrar el checkout de Dodo + webhook + provisión de licencia" — tres piezas: creación de sesión de checkout, recepción de webhooks y activación del plan del usuario.

**S3.** "Primero en test mode, con una compra de prueba end-to-end; después en live mode." — test mode y live mode son entornos separados (claves, productos y webhooks distintos). La unidad se cierra en test mode con una compra real de prueba; live mode es la última fase.

**S4.** "provisión de licencia" = **entitlement en la DB**, sin clave de licencia visible: la licencia es el plan. Se guarda `Subscription.status`, `planId`, el id externo de la suscripción y el fin de período; el límite de contraseñas se sigue leyendo de `Plan.maxPasswords`, no se duplica.

**S5.** Los webhooks se verifican por firma (**HMAC-SHA256 standard-webhooks** sobre `webhook-id.webhook-timestamp.cuerpo crudo`, ventana de 5 minutos) y son **idempotentes** por `webhook-id`. Nunca se procesa un cuerpo sin verificar. Se responde 2xx sólo después de persistir el evento.

**S6.** "la persistencia/cola entra en esta misma unidad": todo evento se persiste en una tabla propia con estado, intentos y error; el trabajo se procesa best-effort después de responder (`after()`) y un drenaje protegido por secreto recupera lo pendiente.

**S7.** El precio de la compra sale de la DB (`Plan.price`), nunca del cuerpo del request. El usuario se toma de la sesión (`auth()`), nunca del body.

**S8.** El actor de un cambio de plan es sólo el webhook. Un evento más viejo que el estado ya aplicado no puede degradar el plan.

**S9.** Migración **aditiva** y idempotente. No se ejecuta `prisma migrate`/`db push` contra la base de producción: la aplica el owner. Se agrega `Plan.interval` (nullable, sin UI) para que el plan anual entre después sin otra migración.

**S10.** Cobertura de tests de la lógica pura (mapeo de eventos → estado, mapeo plan → producto) bajo `lib/**/*.test.ts`, que es la única ruta que corre `vitest`.

## Tasks

| # | Tarea | Specs | Ruta |
|---|---|---|---|
| T1 | Dependencia `dodopayments` + `lib/billing/dodo/env.ts` con validación de entorno | S3 | inline/writer |
| T2 | Esquema aditivo: `BillingWebhookEvent`, `BillingCustomer`, columnas en `Subscription`, `Plan.interval` + SQL idempotente | S4, S9 | writer |
| T3 | `lib/billing/dodo/{products,client}.ts`: mapa plan→producto por modo + cliente único | S3, S7 | writer |
| T4 | `POST /api/dodo/checkout`: sesión, Zod, precio desde DB, metadata `{userId, planId}`, guardia de doble suscripción | S1, S7 | writer |
| T5 | Botón de Dodo en `/pricing` reemplazando el placeholder "próximamente" | S1 | writer |
| T6 | `POST /api/webhooks/dodo`: cuerpo crudo, firma, idempotencia, 200 rápido, `after()` | S5, S6 | writer |
| T7 | `lib/billing/dodo/apply-event.ts`: reducer puro evento → comandos, con test por transición | S8 | writer |
| T8 | `lib/billing/dodo/provision.ts`: aplicación atómica, monótona, idempotente | S4, S8 | writer |
| T9 | `POST /api/internal/billing/drain`: lease, backoff, secreto compartido | S6 | writer |
| T10 | Workflow de GitHub Actions cada 10 min contra el drain | S6 | writer |
| T11 | Verificación E2E test mode con `dodo wh listen` y tarjeta 4242 | S3, S4, S5 | padre |
| T12 | Live mode: productos copiados, webhook live, claves live, `/terms` §1 y `/privacy` §4 nombrando a Dodo, README | S3 | padre + owner |

## Log

**L1** (pedido original, 22-nov-2026): "Integrar los cobros de Iron Key con Dodo Payments, en este repo." Contexto: cuenta de Dodo aprobada y live, a nombre real, payout verificado (Nu, COP); checklist al 30% y lo que falta son las dos integraciones. "Decidido: Iron Key cobra con Dodo; Paddle queda para Provechio, en pausa, esperando un cambio de nombre legal." "Tarea: integrar el checkout de Dodo + webhook + provisión de licencia. Primero en test mode, con una compra de prueba end-to-end; después en live mode." "Restricción conocida: los webhooks no pueden vivir en Vercel Hobby por el timeout de 60 s; la persistencia/cola entra en esta misma unidad." "Mostrame el plan antes de tocar código."

**L2** (corrección de premisa, 22-nov-2026): Vercel Hobby ya no limita a 60 s con Fluid compute (300 s default y máximo). Lo que sí limita Hobby es el cron: mínimo una corrida por día. `pg_notify` no sirve en serverless (requiere `LISTEN` persistente). La cola se justifica por idempotencia, auditoría y replay.

**L3** (decisiones del owner, 22-nov-2026): "Entitlement en la DB (recomendado)". Drenaje: "after() + GitHub Actions cada 10 min (recomendado)". Commits: "El commit lo hacemos ambos, usualmente o mayormente yo, pero sí y sólo sí te lo autorizo yo, además muchas veces te he dado o indicado mi flujio de git." Verificación live: "Codigo de descuento de el 100%".

**L4** (alcance anual, 22-nov-2026): "La mejor opción" → opción 2: se agrega `Plan.interval` nullable ahora, sin UI; el plan anual (productos separados + Product Collection en Dodo) entra como unidad aparte.

**L5** (cupones, 22-nov-2026): los cupones que el owner quiere (100% permanente propio, 3 meses al 50%, 100% para alguien cercano, 1 mes gratis) son configuración del panel de Dodo, no código. `subscription_cycles` es el campo que acota la duración del descuento.

**L6** (hallazgo del mapa del repo): `lib/validate-plan-limit.ts` no mira `status`, así que la degradación se hace devolviendo `planId` al plan Free en vez de tocar el validador. `vitest` sólo incluye `lib/**/*.test.ts`. No hay `.env.example` versionado: las variables se documentan en el README.

**L7** (verificación independiente, 22-nov-2026): la verificación encontró un bloqueante que los 80 tests en verde no podían ver. El reducer leía `data.current_period_end`, un campo que no existe en `dodopayments@2.63.1` (el real es `next_billing_date`), porque los fixtures lo inventaban: fixture y código coincidían sobre un payload que Dodo nunca manda. Consecuencias: `currentPeriodEnd` siempre nulo, el barrido de vencidas nunca matcheaba (un cliente que cancela conserva el plan pago para siempre) y el guard de checkout trataba nulo como "con acceso" (409 permanente después de la primera compra).
Corregido además: un `expired` de una suscripción vieja degradaba a un usuario al día (ahora las bajas exigen que el `subscription_id` coincida); el adapter sustituía el timestamp ausente por la hora de recepción y salteaba la protección de orden; el usuario se resolvía sólo por `metadata.userId` (se agregó fallback por `customer.email`); y `BillingCustomer` quedó fuera del esquema y de la migración por no tener escritor.
Lección registrada: un fixture inventado no es evidencia. `payload-shape.test.ts` fija la forma real del payload y verifica que el fixture **no** contenga campos que el SDK desconoce.

**L8** (compra de prueba real, 24-nov-2026): primera compra end-to-end en test mode, contra una rama de Neon (`pruebas`) y no contra producción. Resultado: `subscription.active` aplicado y `done`, suscripción `active` con plan Starter y el `sub_…` de Dodo, y el vault pasando de 18 a 40 contraseñas. `/pricing` muestra "Plan actual" en Starter y el botón de Dodo desaparece de esa tarjeta.
La prueba encontró **dos bugs que ninguna otra verificación vio**: (a) el guard de checkout miraba el `status` de la suscripción guardada pero no de qué plan era, y como todo registro crea una suscripción Free con status `active`, **ningún usuario nuevo podía comprar** — 122 tests, tres lentes y un verificador independiente no lo detectaron porque ningún test construía el caso "usuario Free comprando por primera vez"; (b) el `return_url` apuntaba a `/dashboard`, ruta que no existe (el dashboard vive en `/`), así que todo cliente que pagaba terminaba en un 404.
Un tercer hallazgo salió de los eventos reales: `subscription.renewed` y `subscription.updated` llegaron en el mismo instante que `active`, perdieron el compare-and-set y quedaban `ignored` para siempre. Se corrigió a que un conflicto de escritura sea reintentable y un evento genuinamente viejo siga descartándose.

## Commits (unidad de entrega)

Rama `feat/dodo-payments`, **10 commits** desde `main`, ~4400 líneas autoradas: muy por encima de la guía de ~400 por slice. La entrega va como **un solo push de rama**, sin PRs encadenados, a pedido del owner. El punto de lectura obligatoria es el commit 3 (reducer) y el 7 (corrección de los hallazgos).

| Commit | Contenido |
|---|---|
| `1a291d1` | sdk + esquema + migración + env/products/client |
| `b075d14` | decisión de checkout + ruta + botón + `/pricing` |
| `29c6fc3` | reducer de eventos + fixtures con payload real |
| `4e37d4f` | webhook firmado + provisión + adaptador Prisma |
| `bb9c426` | drenaje + workflow de GitHub Actions |
| `4c09160` | este documento |
| `1cc3543` | corrección de los 9 hallazgos de la revisión nativa |
| `0788f54` | un usuario Free puede comprar (hallado por la prueba real) |
| `6dc8a4d` | `return_url` a una ruta existente (hallado por la prueba real) |
| `bde683a` | un conflicto de escritura se reintenta en vez de descartarse |

