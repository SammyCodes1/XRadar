"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-raised text-ink-muted ring-1 ring-line transition-colors hover:text-ink"
      aria-label="Toggle light mode"
      title="Toggle light mode"
    >
      <Sun className="theme-icon-sun size-4" weight="bold" />
      <Moon className="theme-icon-moon size-4" weight="bold" />
    </button>
  );
}
