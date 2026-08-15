"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { iosSpring } from "../../lib/motion";

export { iosSpring };

export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 22, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.28 }}
      transition={{ ...iosSpring, delay }}
    >
      {children}
    </motion.div>
  );
}
