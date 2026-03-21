export interface PasswordConfig {
  hasLowercase?: boolean;
  hasUppercase?: boolean;
  hasNumbers?: boolean;
  hasSymbols?: boolean;
  length?: number;
}

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
    const randomIndex = Math.floor(Math.random() * charPool.length);
    password += charPool[randomIndex];
  }

  return password;
};
