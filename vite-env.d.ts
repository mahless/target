/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GOOGLE_SCRIPT_URL: string
    readonly VITE_LOGIN_BG_PATTERN_URL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
