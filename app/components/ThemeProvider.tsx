"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import { Toaster } from "sonner"

function ThemedToaster() {
  const { resolvedTheme } = useTheme()
  return (
    <Toaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-right"
      toastOptions={{
        style: {
          background: "var(--bg-surface)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
          boxShadow: resolvedTheme === "dark" ? "none" : "0 2px 8px rgba(0, 0, 0, 0.06)",
        },
        classNames: {
          title: "text-[var(--text-primary)] font-bold",
          description: "text-[var(--text-secondary)]",
          success: "!border-[var(--success)]/40 !text-[var(--text-primary)]",
          error: "!border-[var(--error)]/40 !text-[var(--text-primary)]",
          warning: "!border-[var(--warning)]/40 !text-[var(--text-primary)]",
          info: "!border-[var(--primary)]/40 !text-[var(--text-primary)]",
        },
      }}
    />
  )
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <ThemedToaster />
      {children}
    </NextThemesProvider>
  )
}
