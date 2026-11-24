/**
 * Mapa plan de Iron Key → producto de Dodo Payments.
 *
 * Es data pura, sin `process.env`, para que un test pueda afirmar el mapeo sin
 * configurar nada. Los nombres de plan son los que siembra `prisma/seed.ts`
 * (`free`, `starter`, `pro`); el plan free no se compra, así que no tiene
 * producto.
 */

import type { DodoProductEnvVar } from "./env";

/** Nombre de plan sembrado → variable de entorno con el id de producto. */
export const PLAN_PRODUCT_ENV_VARS = {
  free: null,
  starter: "DODO_PRODUCT_STARTER",
  pro: "DODO_PRODUCT_PRO",
} as const satisfies Record<string, DodoProductEnvVar | null>;

export type SeededPlanName = keyof typeof PLAN_PRODUCT_ENV_VARS;

/** Ids de producto disponibles, indexados por variable de entorno. */
export type DodoProducts = Partial<
  Record<DodoProductEnvVar, string | null | undefined>
>;

function lookupEnvVar(planName: string): DodoProductEnvVar | null {
  const mapping = PLAN_PRODUCT_ENV_VARS as Record<string, DodoProductEnvVar | null | undefined>;
  const envVar = mapping[planName];

  if (envVar === undefined) {
    throw new Error(`Unknown plan "${planName}": it has no Dodo product mapping.`);
  }

  return envVar;
}

/** Variable de entorno con el producto del plan, o `null` si no se compra. */
export function productEnvVarForPlan(planName: string): DodoProductEnvVar | null {
  return lookupEnvVar(planName);
}

/**
 * Id de producto (`pdt_…`) del plan, o `null` para el plan free.
 *
 * Lanza si el plan no existe o si es pago y su producto no está configurado,
 * nombrando el plan y la variable de entorno que falta.
 */
export function getProductIdForPlan(
  planName: string,
  products: DodoProducts
): string | null {
  const envVar = lookupEnvVar(planName);

  if (envVar === null) {
    return null;
  }

  const productId = products[envVar]?.trim();

  if (!productId) {
    throw new Error(
      `Plan "${planName}" has no Dodo product configured: ${envVar} is missing.`
    );
  }

  return productId;
}
