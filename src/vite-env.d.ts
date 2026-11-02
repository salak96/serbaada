/// <reference types="vite/client" />

declare const __API_KEY__: string;
declare const __ABELLAB_API_KEY__: string;

interface ImportMetaEnv {
  readonly VITE_API_KEY?: string;
  readonly 'X-API-KEY'?: string;
  readonly VITE_ABELLAB_API_KEY?: string;
  readonly ABELLAB_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
