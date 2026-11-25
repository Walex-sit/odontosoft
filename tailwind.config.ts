import type { Config } from "tailwindcss";

/**
 * Tailwind Config — OdontoSoft
 *
 * TOKENS SEMÂNTICOS: todas as cores usam variáveis CSS definidas em globals.css.
 * PROIBIDO adicionar classes blue-*, indigo-*, slate-*, violet-* sem token.
 * As classes Tailwind padrão ainda funcionam para estado semântico (emerald=sucesso,
 * amber=alerta, red=erro) mas NÃO como decoração.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Tokens semânticos mapeados para CSS vars ── */
        base:      "var(--bg-base)",
        surface:   "var(--bg-surface)",
        border:    "var(--border)",
        "border-md": "var(--border-medium)",

        "text-pri":  "var(--text-primary)",
        "text-sec":  "var(--text-secondary)",
        "text-mut":  "var(--text-muted)",

        primary:              "var(--primary)",
        "primary-hover":      "var(--primary-hover)",
        "primary-fill":       "var(--primary-fill)",
        "primary-fill-hover": "var(--primary-fill-hover)",
        "on-primary":         "var(--on-primary)",
        "primary-subtle":     "var(--primary-subtle)",

        success:   "var(--success)",
        "success-bg": "var(--success-bg)",
        warning:   "var(--warning)",
        "warning-bg": "var(--warning-bg)",
        error:     "var(--error)",
        "error-bg": "var(--error-bg)",

        /* Super Admin âmbar */
        "super-bg":      "var(--super-bg)",
        "super-surface": "var(--super-surface)",
        "super-text":    "var(--super-text)",
      },
    },
  },
  plugins: [],
};
export default config;
