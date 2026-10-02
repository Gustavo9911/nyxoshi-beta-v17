/**
 * Local email/password sign-in (this app's Better Auth DB — not the broker).
 *
 * Enabled for the Nyxoshi Beta. The UI intentionally exposes only this flow
 * until social authentication is explicitly enabled, then build sign-up / sign-in forms with `authClient.signUp.email` /
 * `authClient.signIn.email` from `@/lib/auth/client` (see the auth skill).
 *
 * Do NOT edit `server.ts` for this — that file is frozen pre-wired config.
 */
export const emailAndPasswordEnabled = true;
