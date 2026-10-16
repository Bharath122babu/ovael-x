/**
 * Authentication validation rules matching backend/src/adaptive_backend/auth.py
 *
 * Backend reference constraints:
 * - Username: strip(), length 3-64, allowed chars: [a-zA-Z0-9._-]
 * - Password (register & recover): length 10-256, no composition rules
 * - Login: non-empty only (preserves legacy/demo credentials)
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 64;
export const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 256;

export type AuthValidationMode = "login" | "register" | "recover";

/**
 * Validates a username or learner ID according to backend rules.
 * In sign-in mode, only non-empty is required.
 */
export function validateUsername(
  value: string,
  mode: AuthValidationMode = "register",
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Please enter your learner ID.";
  }

  // Sign-in mode never restricts character set or minimum length
  if (mode === "login") {
    return null;
  }

  if (trimmed.length < USERNAME_MIN || trimmed.length > USERNAME_MAX) {
    return `Use ${USERNAME_MIN} to ${USERNAME_MAX} characters.`;
  }

  if (trimmed.includes(" ")) {
    return "Letters, numbers, . _ and - only. Remove the space.";
  }

  if (!USERNAME_PATTERN.test(trimmed)) {
    return "Letters, numbers, . _ and - only.";
  }

  return null;
}

/**
 * Validates a password according to backend rules.
 * In sign-in mode, only non-empty is required.
 * In register and recover modes, length must be 10 to 256 characters.
 * Deliberately does NOT impose arbitrary symbol/case composition rules.
 */
export function validatePassword(
  value: string,
  mode: AuthValidationMode = "register",
): string | null {
  if (!value) {
    return "Please enter your password.";
  }

  // Sign-in mode never restricts minimum length (e.g. 8-char demo password)
  if (mode === "login") {
    return null;
  }

  if (value.length < PASSWORD_MIN) {
    return `Password must contain at least ${PASSWORD_MIN} characters.`;
  }

  if (value.length > PASSWORD_MAX) {
    return `Password is too long (maximum ${PASSWORD_MAX} characters).`;
  }

  return null;
}

/**
 * Validates an account recovery key.
 */
export function validateRecoveryKey(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Please enter your recovery key.";
  }
  return null;
}

/**
 * Generates plain-text content for the client-side downloaded recovery key file.
 * Never includes passwords or sensitive profile data.
 */
export function generateRecoveryFileContent(
  username: string,
  recoveryKey: string,
  date: string = new Date().toISOString(),
): string {
  return [
    "OVAEL-X Account Recovery Key",
    "============================",
    `Learner ID : ${username.trim()}`,
    `Generated  : ${date}`,
    "",
    "Recovery Key:",
    recoveryKey.trim(),
    "",
    "IMPORTANT SECURITY NOTICE:",
    "- Keep this file private and store it in a secure location.",
    "- Anyone with access to this key can reset your account password.",
    "- This recovery key is single-use: using it will automatically revoke",
    "  it and generate a new replacement key.",
    "- OVAEL administrators cannot view or restore your account without this key.",
  ].join("\n");
}
