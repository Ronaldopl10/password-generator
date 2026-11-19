import { afterEach, describe, expect, it, vi } from "vitest";
import { generatePassword } from "@/lib/password";

const LOWERCASE = "abcdefghijklmnñopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

describe("generatePassword", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("devuelve exactamente el largo pedido", () => {
    for (const length of [1, 4, 8, 16, 64]) {
      expect(generatePassword({ length })).toHaveLength(length);
    }
  });

  it("usa el largo por defecto (8) cuando no se indica", () => {
    expect(generatePassword()).toHaveLength(8);
  });

  it("solo contiene minúsculas cuando es el único pool habilitado", () => {
    const password = generatePassword({ length: 32, hasLowercase: true });
    expect(password).toHaveLength(32);
    for (const char of password) {
      expect(LOWERCASE).toContain(char);
    }
  });

  it("solo contiene caracteres de los pools de minúsculas y mayúsculas", () => {
    const pool = LOWERCASE + UPPERCASE;
    const password = generatePassword({
      length: 32,
      hasLowercase: true,
      hasUppercase: true,
    });
    expect(password).toHaveLength(32);
    for (const char of password) {
      expect(pool).toContain(char);
    }
  });

  it("solo contiene caracteres de los pools de minúsculas, mayúsculas y números", () => {
    const pool = LOWERCASE + UPPERCASE + NUMBERS;
    const password = generatePassword({
      length: 32,
      hasLowercase: true,
      hasUppercase: true,
      hasNumbers: true,
    });
    expect(password).toHaveLength(32);
    for (const char of password) {
      expect(pool).toContain(char);
    }
  });

  it("solo contiene caracteres de los cuatro pools", () => {
    const pool = LOWERCASE + UPPERCASE + NUMBERS + SYMBOLS;
    const password = generatePassword({
      length: 32,
      hasLowercase: true,
      hasUppercase: true,
      hasNumbers: true,
      hasSymbols: true,
    });
    expect(password).toHaveLength(32);
    for (const char of password) {
      expect(pool).toContain(char);
    }
  });

  it("por defecto solo usa minúsculas", () => {
    const password = generatePassword({ length: 32 });
    for (const char of password) {
      expect(LOWERCASE).toContain(char);
    }
  });

  it("cae a minúsculas cuando ningún pool está habilitado", () => {
    const password = generatePassword({
      length: 32,
      hasLowercase: false,
      hasUppercase: false,
      hasNumbers: false,
      hasSymbols: false,
    });
    expect(password).toHaveLength(32);
    for (const char of password) {
      expect(LOWERCASE).toContain(char);
    }
  });

  it("usa crypto.getRandomValues y no Math.random", () => {
    const randomSpy = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("Math.random no debe usarse para generar contraseñas");
    });

    vi.stubGlobal("crypto", {
      getRandomValues: (arr: Uint32Array) => {
        arr.fill(7);
        return arr;
      },
    });

    const password = generatePassword({ length: 5, hasLowercase: true });
    const expected = LOWERCASE[7 % LOWERCASE.length].repeat(5);

    expect(password).toBe(expected);
    expect(randomSpy).not.toHaveBeenCalled();
  });

  it("falla explícitamente cuando crypto.getRandomValues no está disponible", () => {
    vi.stubGlobal("crypto", undefined);

    expect(() => generatePassword({ length: 8 })).toThrow(/crypto\.getRandomValues/);
  });
});
