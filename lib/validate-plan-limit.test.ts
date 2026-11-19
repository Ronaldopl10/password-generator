import { beforeEach, describe, expect, it, vi } from "vitest";

const { subscriptionFindUnique, passwordCount } = vi.hoisted(() => ({
  subscriptionFindUnique: vi.fn(),
  passwordCount: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: { findUnique: subscriptionFindUnique },
    password: { count: passwordCount },
  },
}));

import { validatePasswordLimit } from "@/lib/validate-plan-limit";

describe("validatePasswordLimit", () => {
  beforeEach(() => {
    subscriptionFindUnique.mockReset();
    passwordCount.mockReset();
  });

  it("no lanza cuando el plan es ilimitado (maxPasswords = -1)", async () => {
    subscriptionFindUnique.mockResolvedValue({
      plan: { maxPasswords: -1, displayName: "Pro+" },
    });
    passwordCount.mockResolvedValue(999_999);

    await expect(validatePasswordLimit("user-1")).resolves.toBeUndefined();
    expect(passwordCount).not.toHaveBeenCalled();
  });

  it("no lanza cuando el count está por debajo del límite del plan", async () => {
    subscriptionFindUnique.mockResolvedValue({
      plan: { maxPasswords: 18, displayName: "Free" },
    });
    passwordCount.mockResolvedValue(5);

    await expect(validatePasswordLimit("user-1")).resolves.toBeUndefined();
    expect(passwordCount).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });

  it("lanza cuando el count alcanza el límite del plan", async () => {
    subscriptionFindUnique.mockResolvedValue({
      plan: { maxPasswords: 18, displayName: "Free" },
    });
    passwordCount.mockResolvedValue(18);

    await expect(validatePasswordLimit("user-1")).rejects.toThrow(/Límite alcanzado/);
  });

  it("lanza cuando el count supera el límite del plan", async () => {
    subscriptionFindUnique.mockResolvedValue({
      plan: { maxPasswords: 40, displayName: "Starter" },
    });
    passwordCount.mockResolvedValue(41);

    await expect(validatePasswordLimit("user-1")).rejects.toThrow(/Límite alcanzado/);
  });

  it("lanza cuando el usuario no tiene suscripción", async () => {
    subscriptionFindUnique.mockResolvedValue(null);

    await expect(validatePasswordLimit("user-1")).rejects.toThrow(
      "Sin plan asignado. Por favor contacta soporte."
    );
  });

  it("lanza cuando la suscripción no tiene plan", async () => {
    subscriptionFindUnique.mockResolvedValue({ plan: null });

    await expect(validatePasswordLimit("user-1")).rejects.toThrow(
      "Sin plan asignado. Por favor contacta soporte."
    );
  });
});
