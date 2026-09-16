"use client";

import Link from "next/link";
import { Globe, User } from "lucide-react";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/", label: "الرئيسية" },
  { href: "/", label: "استكشف" },
  { href: "/", label: "الوجهات" },
  { href: "/", label: "المساعد الذكي" },
  { href: "/dashboard", label: "من نحن" },
];

export function Navbar({ transparent = false }: { transparent?: boolean }) {
  return (
    <header
      className={
        transparent
          ? "absolute inset-x-0 top-0 z-20 px-6 py-5 md:px-10"
          : "border-b px-6 py-4 md:px-10"
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
          style={{ color: transparent ? "#F3EEDD" : "var(--foreground)" }}
        >
          {LINKS.map((l, i) => (
            <Link
              key={l.label}
              href={l.href}
              className={i === 0 ? "border-b-2 pb-1" : "opacity-90 hover:opacity-100"}
              style={i === 0 ? { borderColor: "var(--brand-gold)" } : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium"
            style={{ color: transparent ? "#F3EEDD" : "var(--foreground)" }}
          >
            <Globe size={16} />
            العربية
          </button>
          <button
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "var(--brand-green)" }}
          >
            <User size={15} />
            تسجيل الدخول
          </button>
        </div>
      </div>
    </header>
  );
}
