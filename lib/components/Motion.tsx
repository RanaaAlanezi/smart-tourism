"use client";

import { useEffect, useRef, useState } from "react";

// Fades its children up into place the first time they scroll into view.
export function Reveal({
  children,
  className = "",
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}

const COUNT_UP_MS = 1400;

// Counts from 0 up to `value` once it's known (e.g. after data loads).
export function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (value <= 0) return;
    // Visitors who asked for less motion get the final number straight away.
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : COUNT_UP_MS;
    let frame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = duration ? Math.min((now - startedAt) / duration, 1) : 1;
      // Ease-out: fast at first, settling onto the final number.
      setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{shown}</>;
}
