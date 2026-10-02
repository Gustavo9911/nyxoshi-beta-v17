import { useQuery } from "@tanstack/react-query";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ensureMyProfile } from "@/lib/nyxoshi/server";
import { withAuthRetry } from "@/lib/auth/mutation";

const PROFILE_BOOT_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("O perfil demorou demais para carregar. Tente novamente.")), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

export function useMe() {
  const { user, isPending: sessionPending, error: sessionError } = useCurrentUserState();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => withTimeout(withAuthRetry(() => ensureMyProfile()), PROFILE_BOOT_TIMEOUT_MS),
    enabled: Boolean(user) && !sessionError,
    retry: 1,
    retryDelay: 700,
    staleTime: 15_000,
  });
  return {
    sessionPending,
    sessionError,
    user,
    me: me.data ?? null,
    meLoading: Boolean(user) && me.isLoading,
    meError: me.error,
    retryMe: () => me.refetch(),
  };
}
