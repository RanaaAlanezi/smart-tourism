"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, User, Menu, X } from "lucide-react";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/", label: "الرئيسية" },
  { href: "/explore", label: "استكشف" },
  { href: "/map", label: "الخريطة" },
  { href: "/assistant", label: "المساعد الذكي" },
  { href: "/saved", label: "المحفوظات" },
];

export function Navbar({ transparent = false }: { transparent?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const textColor = transparent ? "#F3EEDD" : "var(--foreground)";

  return (
    <header
      className={
        transparent
          ? "absolute inset-x-0 top-0 z-20 px-6 py-5 md:px-10"
          : "relative border-b px-6 py-4 md:px-10"
      }
      style={
        transparent
          ? undefined
          : { borderColor: "var(--brand-line)", background: "var(--background)" }
      }
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link href="/">
          <Logo light={transparent} />
        </Link>

        <nav
          className="hidden lg:flex items-center gap-7 text-sm font-medium"
          style={{ color: textColor }}
        >
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={active ? "border-b-2 pb-1" : "opacity-90 hover:opacity-100"}
                style={active ? { borderColor: "var(--brand-gold)" } : undefined}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <button
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium"
            style={{ color: textColor }}
          >
            <Globe size={16} />
            العربية
          </button>
          <button
            className="hidden sm:flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "var(--brand-green)" }}
          >
            <User size={15} />
            تسجيل الدخول
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-full lg:hidden"
            style={
              transparent
                ? { background: "rgba(245,242,234,0.15)", color: textColor }
                : { background: "var(--brand-line)", color: textColor }
            }
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div
          className="absolute inset-x-0 top-full z-30 mx-4 mt-2 rounded-2xl border p-3 shadow-xl lg:hidden"
          style={{ borderColor: "var(--brand-line)", background: "var(--background)" }}
        >
          <nav className="flex flex-col gap-1 text-sm font-medium">
            {LINKS.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5"
                  style={{
                    color: "var(--foreground)",
                    background: active ? "var(--brand-line)" : "transparent",
                  }}
                >
                  {l.label}
                </Link>
              );
            })}
            <div className="mt-2 flex items-center gap-2 border-t pt-3" style={{ borderColor: "var(--brand-line)" }}>
              <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium" style={{ color: "var(--foreground)" }}>
                <Globe size={15} />
                العربية
              </button>
              <button
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold text-white"
                style={{ background: "var(--brand-green)" }}
              >
                <User size={14} />
                تسجيل الدخول
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
