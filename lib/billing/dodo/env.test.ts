import { describe, expect, it } from "vitest";

import { DodoConfigError, readDodoConfig } from "@/lib/billing/dodo/env";

const baseEnv = {
  DODO_PAYMENTS_API_KEY: "dodo_test_2f8a1c",
  DODO_PAYMENTS_WEBHOOK_KEY: "whsec_local_test_secret",
  DODO_ENVIRONMENT: "test_mode",
  DODO_PRODUCT_STARTER: "pdt_starter_123",
  DODO_PRODUCT_PRO: "pdt_pro_456",
  BILLING_CRON_SECRET: "0123456789abcdef",
};

function captureError(run: () => unknown): DodoConfigError {
  try {
    run();
  } catch (error) {
    return error as DodoConfigError;
  }
  throw new Error("readDodoConfig debía lanzar un DodoConfigError");
}

describe("readDodoConfig", () => {
  it("devuelve la configuración tipada cuando todo es válido", () => {
    const config = readDodoConfig({ ...baseEnv });

    expect(config).toEqual({
      apiKey: "dodo_test_2f8a1c",
      webhookKey: "whsec_local_test_secret",
      environment: "test_mode",
      products: {
        DODO_PRODUCT_STARTER: "pdt_starter_123",
        DODO_PRODUCT_PRO: "pdt_pro_456",
      },
      cronSecret: "0123456789abcdef",
    });
  });

  it("usa test_mode por defecto cuando DODO_ENVIRONMENT no está definida", () => {
    const { DODO_ENVIRONMENT: _omit, ...withoutEnvironment } = baseEnv;

    expect(readDodoConfig(withoutEnvironment).environment).toBe("test_mode");
  });

  it("junta todas las variables faltantes en un único error", () => {
    const error = captureError(() => readDodoConfig({}));

    expect(error).toBeInstanceOf(DodoConfigError);
    expect(error.issues).toHaveLength(5);
    for (const variable of [
      "DODO_PAYMENTS_API_KEY",
      "DODO_PAYMENTS_WEBHOOK_KEY",
      "DODO_PRODUCT_STARTER",
      "DODO_PRODUCT_PRO",
      "BILLING_CRON_SECRET",
    ]) {
      expect(error.message).toContain(variable);
    }
    expect(error.message).toContain("missing");
    // DODO_ENVIRONMENT es opcional: sin ella se asume test_mode.
    expect(error.message).not.toContain("DODO_ENVIRONMENT");
  });

  it("nombra sólo la variable faltante cuando el resto es válido", () => {
    const { DODO_PRODUCT_PRO: _omit, ...partial } = baseEnv;
    const error = captureError(() => readDodoConfig(partial));

    expect(error.issues).toHaveLength(1);
    expect(error.message).toContain("DODO_PRODUCT_PRO");
    expect(error.message).not.toContain("DODO_PRODUCT_STARTER");
    expect(error.message).not.toContain("DODO_PAYMENTS_API_KEY");
  });

  it("junta en un único error todos los formatos inválidos", () => {
    const error = captureError(() =>
      readDodoConfig({
        ...baseEnv,
        DODO_PAYMENTS_API_KEY: "sk_not_a_dodo_key",
        DODO_PAYMENTS_WEBHOOK_KEY: "secret-without-prefix",
        DODO_ENVIRONMENT: "staging",
        DODO_PRODUCT_STARTER: "starter_123",
        BILLING_CRON_SECRET: "too-short",
      })
    );

    expect(error.issues).toHaveLength(5);
    expect(error.message).toContain('DODO_PAYMENTS_API_KEY: must start with "dodo_test_" or "dodo_live_"');
    expect(error.message).toContain('DODO_PAYMENTS_WEBHOOK_KEY: must start with "whsec_"');
    expect(error.message).toContain('DODO_ENVIRONMENT: must be "test_mode" or "live_mode"');
    expect(error.message).toContain('DODO_PRODUCT_STARTER: must be a product id starting with "pdt_"');
    expect(error.message).toContain("BILLING_CRON_SECRET: must be at least 16 characters");
  });

  it("rechaza una clave dodo_test_ combinada con live_mode", () => {
    const error = captureError(() => readDodoConfig({ ...baseEnv, DODO_ENVIRONMENT: "live_mode" }));

    expect(error.issues).toHaveLength(1);
    expect(error.message).toContain("DODO_PAYMENTS_API_KEY");
    expect(error.message).toContain('"dodo_test_"');
    expect(error.message).toContain('DODO_ENVIRONMENT="live_mode"');
  });

  it("rechaza una clave dodo_live_ combinada con test_mode", () => {
    const error = captureError(() =>
      readDodoConfig({
        ...baseEnv,
        DODO_PAYMENTS_API_KEY: "dodo_live_9b3d",
        DODO_ENVIRONMENT: "test_mode",
      })
    );

    expect(error.issues).toHaveLength(1);
    expect(error.message).toContain("DODO_PAYMENTS_API_KEY");
    expect(error.message).toContain('"dodo_live_"');
    expect(error.message).toContain('DODO_ENVIRONMENT="test_mode"');
  });

  it("acepta una clave dodo_live_ con live_mode", () => {
    const config = readDodoConfig({
      ...baseEnv,
      DODO_PAYMENTS_API_KEY: "dodo_live_9b3d",
      DODO_ENVIRONMENT: "live_mode",
    });

    expect(config.environment).toBe("live_mode");
    expect(config.apiKey).toBe("dodo_live_9b3d");
  });

  it("exige exactamente 16 caracteres como mínimo en BILLING_CRON_SECRET", () => {
    expect(readDodoConfig({ ...baseEnv, BILLING_CRON_SECRET: "0123456789abcdef" }).cronSecret).toBe(
      "0123456789abcdef"
    );
    expect(captureError(() => readDodoConfig({ ...baseEnv, BILLING_CRON_SECRET: "0123456789abcde" })).message).toContain(
      "BILLING_CRON_SECRET: must be at least 16 characters"
    );
  });
});
