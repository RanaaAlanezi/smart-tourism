"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Gamepad2, Globe, Heart, Home, Map as MapIcon, Menu, Sparkles, Trophy, X } from "lucide-react";
import { levelFor, useGamePoints } from "@/lib/games";
import { setLang, useLang } from "@/lib/i18n";
import { Logo } from "./Logo";

// Labels as [Arabic, English].
const LINKS: { href: string; label: [string, string]; icon: typeof Home }[] = [
  { href: "/", label: ["الرئيسية", "Home"], icon: Home },
  { href: "/explore", label: ["استكشف", "Explore"], icon: Compass },
  { href: "/map", label: ["الخريطة", "Map"], icon: MapIcon },
  { href: "/assistant", label: ["المساعد الذكي", "AI Assistant"], icon: Sparkles },
  { href: "/games", label: ["الألعاب", "Games"], icon: Gamepad2 },
  { href: "/saved", label: ["المحفوظات", "Saved"], icon: Heart },
];

// Where the sliding highlight sits inside the link bar.
interface Slot {
  left: number;
  width: number;
}

const slotOf = (element: HTMLElement): Slot => ({ left: element.offsetLeft, width: element.offsetWidth });

// A landmark's page belongs to "explore" as far as the bar is concerned.
function isActive(pathname: string, href: string) {
  if (href === "/explore") return pathname === href || pathname.startsWith("/landmarks");
  return pathname === href;
}

export function Navbar({ transparent = false }: { transparent?: boolean }) {
  const pathname = usePathname();
  const { lang, t } = useLang();
  const points = useGamePoints();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // The highlight follows the pointer (`hovered`) and rests on the current
  // page's link (`current`) when nothing is hovered.
  const [hovered, setHovered] = useState<Slot | null>(null);
  const [current, setCurrent] = useState<Slot | null>(null);
  const barRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      // The reading-progress line is written straight to the element —
      // going through state would re-render the bar on every scroll frame.
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Measures the current page's link. Re-measured whenever the bar changes
  // size (first paint, web font arriving, window resize), not just once.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const measure = () => {
      const link = bar.querySelector<HTMLElement>('[aria-current="page"]');
      setCurrent(link ? slotOf(link) : null);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [pathname, lang]);

  const highlight = hovered ?? current;
  const solid = scrolled || !transparent;

  return (
    <header
      className={`inset-x-0 top-0 z-40 px-4 transition-all duration-300 md:px-10 ${
        transparent ? "fixed" : "sticky"
      } ${scrolled ? "py-2" : "py-4"}`}
      style={
        solid
          ? {
              background: scrolled ? "rgba(13,26,21,0.82)" : "var(--background)",
              backdropFilter: scrolled ? "blur(14px)" : undefined,
              borderBottom: "1px solid var(--brand-line)",
              boxShadow: scrolled ? "0 10px 30px -18px rgba(0,0,0,0.9)" : undefined,
            }
          : { borderBottom: "1px solid transparent" }
      }
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link href="/" className="shrink-0 transition duration-300 hover:-rotate-3 hover:scale-110">
          <Logo />
        </Link>

        {/* link bar with a highlight that slides to the hovered link */}
        <nav
          ref={barRef}
          onMouseLeave={() => setHovered(null)}
          className="relative hidden items-center rounded-full border p-1 text-sm font-semibold lg:flex"
          style={{
            borderColor: "rgba(241,237,225,0.16)",
            background: "rgba(5,16,12,0.45)",
            backdropFilter: "blur(12px)",
            color: "var(--foreground)",
          }}
        >
          {highlight && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-1 left-0 rounded-full transition-all duration-300 ease-out"
              style={{
                width: highlight.width,
                transform: `translateX(${highlight.left}px)`,
                background: "linear-gradient(135deg, rgba(199,154,69,0.32), rgba(199,154,69,0.12))",
                boxShadow: "inset 0 0 0 1px rgba(228,200,146,0.55), 0 0 18px -4px rgba(199,154,69,0.6)",
              }}
            />
          )}
          {LINKS.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                onMouseEnter={(e) => setHovered(slotOf(e.currentTarget))}
                onFocus={(e) => setHovered(slotOf(e.currentTarget))}
                onBlur={() => setHovered(null)}
                className="group relative flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 transition-colors xl:px-4"
                style={{ color: active ? "var(--brand-gold-light)" : undefined }}
              >
                <l.icon
                  size={15}
                  className="transition duration-300 group-hover:-translate-y-0.5 group-hover:scale-125"
                  style={{ color: "var(--brand-gold)" }}
                />
                {t(...l.label)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {/* the player's game points — a live shortcut to the games */}
          <Link
            href="/games"
            title={t(`المستوى ${levelFor(points)}`, `Level ${levelFor(points)}`)}
            className="hidden items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition hover:scale-105 hover:border-[var(--brand-gold)] sm:flex"
            style={{ borderColor: "rgba(241,237,225,0.2)", background: "rgba(5,16,12,0.45)", color: "var(--brand-gold-light)" }}
          >
            <Trophy size={14} />
            {points}
          </Link>
          {/* Switches the whole site to the other language, and is labelled
              with the language it switches to. */}
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            aria-label={t("Switch to English", "التبديل إلى العربية")}
            className="group hidden h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-bold transition hover:scale-105 sm:flex"
            style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
          >
            <Globe size={15} className="transition duration-500 group-hover:rotate-180" />
            {t("English", "العربية")}
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? t("إغلاق القائمة", "Close menu") : t("فتح القائمة", "Open menu")}
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-full transition active:scale-90 lg:hidden"
            style={{ background: "var(--surface-2)", color: "var(--foreground)" }}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* how far down the page the visitor has read */}
      <div
        ref={progressRef}
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-0.5 ltr:origin-left rtl:origin-right"
        style={{ background: "linear-gradient(90deg, var(--brand-gold-light), var(--brand-gold))", transform: "scaleX(0)" }}
      />

      {open && (
        <div
          className="step-fade-in absolute inset-x-0 top-full z-30 mx-4 mt-2 rounded-2xl border p-3 shadow-xl lg:hidden"
          style={{ borderColor: "var(--brand-line)", background: "var(--surface)" }}
        >
          <nav className="flex flex-col gap-1 text-sm font-semibold">
            {LINKS.map((l, index) => {
              const active = isActive(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="fade-up flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{
                    animationDelay: `${index * 45}ms`,
                    color: active ? "var(--brand-gold-light)" : "var(--foreground)",
                    background: active ? "var(--surface-2)" : "transparent",
                  }}
                >
                  <l.icon size={16} style={{ color: "var(--brand-gold)" }} />
                  {t(...l.label)}
                </Link>
              );
            })}
            <div className="mt-2 flex items-center gap-2 border-t pt-3" style={{ borderColor: "var(--brand-line)" }}>
              <Link
                href="/games"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-bold"
                style={{ borderColor: "var(--brand-line)", color: "var(--brand-gold-light)" }}
              >
                <Trophy size={14} />
                {points}
              </Link>
              <button
                onClick={() => setLang(lang === "ar" ? "en" : "ar")}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-bold"
                style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
              >
                <Globe size={15} />
                {t("English", "العربية")}
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
