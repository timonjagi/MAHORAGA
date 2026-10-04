/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional API token, injected at build/dev time from dashboard/.env.local */
  readonly VITE_MAHORAGA_API_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
