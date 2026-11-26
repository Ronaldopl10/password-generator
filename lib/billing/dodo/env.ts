/**
 * Lectura y validación de la configuración de Dodo Payments.
 *
 * Todo lo que necesita el resto del módulo (`client`, `products`, checkout,
 * webhook) sale de acá. La validación junta **todos** los problemas en un solo
 * error: así una config a medio cargar se arregla de una vez y no de a un
 * reinicio por variable.
 */

export type DodoEnvironment = "test_mode" | "live_mode";

export type DodoProductEnvVar = "DODO_PRODUCT_STARTER" | "DODO_PRODUCT_PRO";

export const DODO_PRODUCT_ENV_VARS = [
  "DODO_PRODUCT_STARTER",
  "DODO_PRODUCT_PRO",
] as const satisfies readonly DodoProductEnvVar[];

export interface DodoConfig {
  /** `DODO_PAYMENTS_API_KEY` (`dodo_test_…` o `dodo_live_…`). */
  apiKey: string;
  /** `DODO_PAYMENTS_WEBHOOK_KEY` (`whsec_…`): secreto de firma de webhooks. */
  webhookKey: string;
  /** `DODO_ENVIRONMENT`: a qué entorno apunta el cliente. */
  environment: DodoEnvironment;
  /** Ids de producto (`pdt_…`) por variable de entorno. */
  products: Record<DodoProductEnvVar, string>;
  /** `BILLING_CRON_SECRET`: secreto compartido del drenaje de eventos. */
  cronSecret: string;
}

/** Error único con todos los problemas de configuración encontrados. */
export class DodoConfigError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid Dodo Payments configuration:\n  - ${issues.join("\n  - ")}`);
    this.name = "DodoConfigError";
    this.issues = issues;
  }
}

type Env = Record<string, string | undefined>;

const API_KEY_TEST_PREFIX = "dodo_test_";
const API_KEY_LIVE_PREFIX = "dodo_live_";
const WEBHOOK_KEY_PREFIX = "whsec_";
const PRODUCT_ID_PREFIX = "pdt_";
const CRON_SECRET_MIN_LENGTH = 16;

const DODO_ENVIRONMENTS: readonly DodoEnvironment[] = ["test_mode", "live_mode"];
const DEFAULT_ENVIRONMENT: DodoEnvironment = "test_mode";

function readTrimmed(env: Env, name: string): string {
  return (env[name] ?? "").trim();
}

/**
 * Valida el entorno y devuelve la configuración tipada.
 *
 * Lanza un `DodoConfigError` con la lista completa de variables faltantes o
 * inválidas. Se pasa `env` sólo para tests: en runtime el default es
 * `process.env`.
 */
export function readDodoConfig(env: Env = process.env): DodoConfig {
  const issues: string[] = [];

  const rawApiKey = readTrimmed(env, "DODO_PAYMENTS_API_KEY");
  const apiKeyIsTest = rawApiKey.startsWith(API_KEY_TEST_PREFIX);
  const apiKeyIsLive = rawApiKey.startsWith(API_KEY_LIVE_PREFIX);

  if (!rawApiKey) {
    issues.push("DODO_PAYMENTS_API_KEY: missing");
  } else if (!apiKeyIsTest && !apiKeyIsLive) {
    issues.push(
      'DODO_PAYMENTS_API_KEY: must start with "dodo_test_" or "dodo_live_"'
    );
  }

  const webhookKey = readTrimmed(env, "DODO_PAYMENTS_WEBHOOK_KEY");

  if (!webhookKey) {
    issues.push("DODO_PAYMENTS_WEBHOOK_KEY: missing");
  } else if (!webhookKey.startsWith(WEBHOOK_KEY_PREFIX)) {
    issues.push('DODO_PAYMENTS_WEBHOOK_KEY: must start with "whsec_"');
  }

  const rawEnvironment = readTrimmed(env, "DODO_ENVIRONMENT");
  const environmentIsValid =
    !rawEnvironment ||
    (DODO_ENVIRONMENTS as readonly string[]).includes(rawEnvironment);

  if (!environmentIsValid) {
    issues.push(
      `DODO_ENVIRONMENT: must be "test_mode" or "live_mode" (got "${rawEnvironment}")`
    );
  }

  const environment = (rawEnvironment || DEFAULT_ENVIRONMENT) as DodoEnvironment;

  // La API devuelve 401 cuando la clave y el entorno no coinciden.
  if (environmentIsValid && (apiKeyIsTest || apiKeyIsLive)) {
    if (apiKeyIsTest && environment === "live_mode") {
      issues.push(
        `DODO_PAYMENTS_API_KEY: "dodo_test_" key cannot be used with DODO_ENVIRONMENT="live_mode"`
      );
    }

    if (apiKeyIsLive && environment === "test_mode") {
      issues.push(
        `DODO_PAYMENTS_API_KEY: "dodo_live_" key cannot be used with DODO_ENVIRONMENT="test_mode"`
      );
    }
  }

  const products = {} as Record<DodoProductEnvVar, string>;

  for (const envVar of DODO_PRODUCT_ENV_VARS) {
    const productId = readTrimmed(env, envVar);

    if (!productId) {
      issues.push(`${envVar}: missing`);
      continue;
    }

    if (!productId.startsWith(PRODUCT_ID_PREFIX)) {
      issues.push(`${envVar}: must be a product id starting with "pdt_"`);
      continue;
    }

    products[envVar] = productId;
  }

  const cronSecret = readTrimmed(env, "BILLING_CRON_SECRET");

  if (!cronSecret) {
    issues.push("BILLING_CRON_SECRET: missing");
  } else if (cronSecret.length < CRON_SECRET_MIN_LENGTH) {
    issues.push(
      `BILLING_CRON_SECRET: must be at least ${CRON_SECRET_MIN_LENGTH} characters`
    );
  }

  if (issues.length > 0) {
    throw new DodoConfigError(issues);
  }

  return {
    apiKey: rawApiKey,
    webhookKey,
    environment,
    products,
    cronSecret,
  };
}
