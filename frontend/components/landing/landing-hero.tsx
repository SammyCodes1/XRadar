"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useRef } from "react";
import { iosSpring } from "./reveal";

const SAMPLE_REPORT =
  "/token/0xD44Dec3B0617Fb707D4101814a51a6741469cebe?chain=testnet";

export function LandingHero() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.06, 1.16]);
  const veil = useTransform(scrollYProgress, [0, 0.8], [0.15, 0.55]);

  return (
    <section ref={ref} className="relative min-h-[100dvh] overflow-hidden">
      <motion.div
        className="absolute inset-0"
        style={reduce ? undefined : { y: imageY, scale: imageScale }}
      >
        <Image
          src="/landing/hero-bg.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center lg:object-[70%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-void via-void/90 to-void/40 lg:via-void/80 lg:to-void/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-void/50" />
        <motion.div
          className="absolute inset-0 bg-void"
          style={reduce ? undefined : { opacity: veil }}
        />
      </motion.div>

      <div className="relative z-10 flex min-h-[100dvh] w-full items-center justify-start px-4 pb-20 pt-[calc(5.5rem+env(safe-area-inset-top))] sm:px-8 sm:pb-16 sm:pt-24">
        <div className="w-full max-w-xl text-left">
          <motion.h1
            className="max-w-[11ch] text-[2.15rem] font-semibold leading-[1.08] tracking-tight text-ink sm:max-w-none sm:text-6xl sm:leading-none sm:tracking-tighter lg:text-7xl xl:text-8xl"
            initial={reduce ? false : { opacity: 0, y: 22, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ ...iosSpring, delay: 0.08 }}
          >
            Scan a token. Trust the chain.
          </motion.h1>
          <motion.p
            className="mt-4 max-w-[34ch] text-[15px] leading-6 text-ink-muted sm:text-base sm:leading-7"
            initial={reduce ? false : { opacity: 0, y: 18, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ ...iosSpring, delay: 0.2 }}
          >
            Paste a contract. XRadar checks it, then writes the score on
            RiskRegistry.
          </motion.p>
          <motion.div
            className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...iosSpring, delay: 0.28 }}
          >
            <motion.div
              whileHover={reduce ? undefined : { scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              <Link
                href="/scan"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-medium text-on-accent hover:bg-accent-hot sm:w-auto"
              >
                Open the scanner
                <ArrowRight className="size-4" weight="bold" />
              </Link>
            </motion.div>
            <motion.div
              whileHover={reduce ? undefined : { scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              <Link
                href={SAMPLE_REPORT}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-void/35 px-4 text-sm text-ink ring-1 ring-line backdrop-blur-md hover:bg-void/55 sm:w-auto"
              >
                Read a report
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
