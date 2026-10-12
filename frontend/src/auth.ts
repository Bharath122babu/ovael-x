/** Must match AuthService.validate_password in backend/src/adaptive_backend/auth.py. */
export const MIN_PASSWORD_LENGTH=10;
/** Sign-in never enforces a minimum: existing accounts (e.g. the 8-character demo user) must still log in. */
export function passwordMinLength(mode:'login'|'register'):number|undefined{
  return mode==='register'?MIN_PASSWORD_LENGTH:undefined;
}
