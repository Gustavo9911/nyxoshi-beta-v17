/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_ENABLED?: string;
  readonly VITE_SOCIAL_AUTH_ENABLED?: string;
  readonly VITE_PUBLIC_HOSTNAME?: string;
  readonly VITE_PROJECT_ID?: string;
  readonly VITE_OG_SERVICE_URL?: string;
  readonly VITE_STUN_URLS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
