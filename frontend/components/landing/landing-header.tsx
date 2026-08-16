"use client";

import Link from "next/link";
import { Scan } from "@phosphor-icons/react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ThemeToggle } from "../theme-toggle";
import { iosSpring } from "./reveal";

export function LandingHeader() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 80], [0.08, 0.72]);
  const blur = useTransform(scrollY, [0, 80], [8, 22]);
  const border = useTransform(scrollY, [0, 80], [0, 0.12]);
  const headerStyle = {
    backgroundColor: useTransform(bg, (value) => `rgba(var(--void-rgb), ${value})`),
    backdropFilter: useTransform(blur, (value) => `blur(${value}px) saturate(180%)`),
    WebkitBackdropFilter: useTransform(
      blur,
      (value) => `blur(${value}px) saturate(180%)`,
    ),
    borderBottomColor: useTransform(
      border,
      (value) => `rgba(var(--ink-rgb), ${value})`,
    ),
  };

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-30 border-b border-transparent pt-[env(safe-area-inset-top)]"
      style={reduce ? undefined : headerStyle}
      initial={reduce ? false : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={iosSpring}
    >
      <div className="flex h-14 w-full items-center justify-between gap-2 px-4 sm:h-16 sm:gap-4 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5" aria-label="XRadar">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-raised ring-1 ring-line">
            <Scan className="size-4 text-accent" weight="bold" />
          </span>
          <span className="truncate text-sm font-semibold tracking-tight">XRadar</span>
        </Link>
        <nav className="flex shrink-0 items-center gap-2 text-sm sm:gap-5">
          <a
            href="#method"
            className="hidden text-ink-muted transition-colors hover:text-ink sm:inline"
          >
            How it works
          </a>
          <a
            href="#registry"
            className="hidden text-ink-muted transition-colors hover:text-ink sm:inline"
          >
            On-chain
          </a>
          <ThemeToggle />
          <motion.div whileHover={reduce ? undefined : { scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/scan"
              className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-xs font-medium text-on-accent hover:bg-accent-hot sm:h-8"
            >
              <span className="sm:hidden">Scanner</span>
              <span className="hidden sm:inline">Open the scanner</span>
            </Link>
          </motion.div>
        </nav>
      </div>
    </motion.header>
  );
}
