import { authClient } from "./client";

const SESSION_REFRESH_TIMEOUT_MS = 4_000;

async function refreshSessionBounded(): Promise<void> {
  await Promise.race([
    authClient.getSession().then(() => undefined),
    new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("A sessão não respondeu a tempo.")), SESSION_REFRESH_TIMEOUT_MS)),
  ]);
}

/**
 * Retries one authenticated server-function mutation after refreshing Better Auth's
 * session cache. A short timeout prevents a broken session refresh from leaving a
 * button spinning forever.
 */
export async function withAuthRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "Unauthorized") throw error;
    try {
      await refreshSessionBounded();
    } catch {
      throw error;
    }
    return operation();
  }
}
