export interface PasswordConfig {
  hasLowercase?: boolean;
  hasUppercase?: boolean;
  hasNumbers?: boolean;
  hasSymbols?: boolean;
  length?: number;
}

/**
 * Devuelve un índice uniforme dentro de `[0, poolLength)` usando el CSPRNG de la
 * plataforma (`crypto.getRandomValues`).
 *
 * Se aplica *rejection sampling*: se descartan los valores mayores o iguales a
 * `floor(2^32 / poolLength) * poolLength`, porque `valor % poolLength` sobre el
 * rango completo de un `uint32` introduce sesgo de módulo (los primeros
 * `2^32 % poolLength` valores del rango pesan más que el resto).
 *
 * Si `crypto.getRandomValues` no existe, falla explícitamente: nunca se vuelve
 * a `Math.random`, que no es criptográficamente seguro.
 */
const getSecureRandomIndex = (poolLength: number): number => {
  const webCrypto = globalThis.crypto;

  if (!webCrypto || typeof webCrypto.getRandomValues !== "function") {
    throw new Error(
      "crypto.getRandomValues no está disponible: se requiere un entorno con Web Crypto (navegador o Node 18+) para generar contraseñas seguras."
    );
  }

  const limit = Math.floor(0x100000000 / poolLength) * poolLength;
  const buffer = new Uint32Array(1);

  for (;;) {
    webCrypto.getRandomValues(buffer);
    const value = buffer[0];

    if (value < limit) {
      return value % poolLength;
    }
  }
};

export const generatePassword = ({
  hasLowercase = true,
  hasUppercase = false,
  hasNumbers = false,
  hasSymbols = false,
  length = 8,
}: PasswordConfig = {}) => {
  const lowercaseChars = "abcdefghijklmnñopqrstuvwxyz";
  const uppercaseChars = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
  const numberChars = "0123456789";
  const symbolsChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  let charPool = "";
  if (hasLowercase) charPool += lowercaseChars;
  if (hasUppercase) charPool += uppercaseChars;
  if (hasNumbers) charPool += numberChars;
  if (hasSymbols) charPool += symbolsChars;

  if (charPool.length === 0) {
    charPool = lowercaseChars;
  }

  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = getSecureRandomIndex(charPool.length);
    password += charPool[randomIndex];
  }

  return password;
};
