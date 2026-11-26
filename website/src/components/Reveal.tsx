import type { ReactNode } from "react";
import { motion } from "motion/react";

/** Fades and lifts its children in the first time they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** The heading block every section opens with. */
export function SectionHead({
  eyebrow,
  title,
  children,
  center,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  center?: boolean;
}) {
  return (
    <Reveal className={center ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}>
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="h-display mt-5 text-[40px] sm:text-[56px]">{title}</h2>
      {children && <p className="mt-5 text-[17px] leading-relaxed text-ink-300 sm:text-[18px]">{children}</p>}
    </Reveal>
  );
}
