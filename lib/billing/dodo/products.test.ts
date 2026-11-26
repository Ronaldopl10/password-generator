import { describe, expect, it } from "vitest";

import {
  PLAN_PRODUCT_ENV_VARS,
  getProductIdForPlan,
  productEnvVarForPlan,
} from "@/lib/billing/dodo/products";

const configuredProducts = {
  DODO_PRODUCT_STARTER: "pdt_starter_123",
  DODO_PRODUCT_PRO: "pdt_pro_456",
};

describe("plan → producto de Dodo", () => {
  it("mapea cada plan pago sembrado a su variable de entorno", () => {
    expect(PLAN_PRODUCT_ENV_VARS).toEqual({
      free: null,
      starter: "DODO_PRODUCT_STARTER",
      pro: "DODO_PRODUCT_PRO",
    });
  });

  it("el plan free no tiene producto", () => {
    expect(getProductIdForPlan("free", configuredProducts)).toBeNull();
    expect(productEnvVarForPlan("free")).toBeNull();
  });

  it("devuelve el id de producto configurado para los planes pagos", () => {
    const starter = "pdt_starter_123";
    const pro = "pdt_pro_456";

    expect(getProductIdForPlan("starter", configuredProducts)).toBe(starter);
    expect(getProductIdForPlan("pro", configuredProducts)).toBe(pro);
  });

  it("lance un error nombrando el plan desconocido", () => {
    expect(() => getProductIdForPlan("enterprise", configuredProducts)).toThrow(/"enterprise"/);
    expect(() => getProductIdForPlan("enterprise", configuredProducts)).toThrow(/no Dodo product mapping/);
    expect(() => productEnvVarForPlan("enterprise")).toThrow(/"enterprise"/);
  });

  it("lance un error nombrando el plan y la variable faltante cuando el plan pago no está configurado", () => {
    expect(() => getProductIdForPlan("pro", { DODO_PRODUCT_STARTER: "pdt_starter_123" })).toThrow(/"pro"/);
    expect(() => getProductIdForPlan("pro", { DODO_PRODUCT_STARTER: "pdt_starter_123" })).toThrow(
      /DODO_PRODUCT_PRO is missing/
    );
    expect(() => getProductIdForPlan("starter", {})).toThrow(/DODO_PRODUCT_STARTER is missing/);
  });

  it("trata un id vacío o en blanco como no configurado", () => {
    expect(() => getProductIdForPlan("starter", { DODO_PRODUCT_STARTER: "   " })).toThrow(
      /DODO_PRODUCT_STARTER is missing/
    );
    expect(() => getProductIdForPlan("starter", { DODO_PRODUCT_STARTER: "" })).toThrow(
      /DODO_PRODUCT_STARTER is missing/
    );
  });
});
