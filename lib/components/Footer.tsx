"use client";

import Link from "next/link";
import { CATEGORY_ICON, FILTER_LABELS, FilterCategory, filterLabel } from "@/lib/categories";
import { useLang } from "@/lib/i18n";
import { Logo } from "./Logo";

// Labels as [Arabic, English].
const SITE_LINKS: { href: string; label: [string, string] }[] = [
  { href: "/", label: ["الرئيسية", "Home"] },
  { href: "/explore", label: ["استكشف", "Explore"] },
  { href: "/map", label: ["الخريطة", "Map"] },
  { href: "/assistant", label: ["المساعد الذكي", "AI Assistant"] },
  { href: "/games", label: ["الألعاب", "Games"] },
  { href: "/saved", label: ["المحفوظات", "Saved"] },
];

export function Footer() {
  const { lang, t } = useLang();
  const linkClass = "text-sm transition hover:text-[var(--brand-gold-light)]";

  return (
    <footer className="border-t" style={{ borderColor: "var(--brand-line)", background: "var(--brand-green-dark)" }}>
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:px-10">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-7" style={{ color: "var(--text-muted)" }}>
            {t(
              "دليلك الذكي لاكتشاف معالم المملكة العربية السعودية: استكشف، اسأل، والعب.",
              "Your smart guide to the landmarks of Saudi Arabia: explore, ask and play."
            )}
          </p>
        </div>

        <nav aria-label={t("روابط الموقع", "Site links")}>
          <h2 className="mb-4 text-sm font-extrabold" style={{ color: "var(--brand-gold-light)" }}>
            {t("الموقع", "Site")}
          </h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5" style={{ color: "var(--text-muted)" }}>
            {SITE_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={linkClass}>
                  {t(...link.label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t("استكشف حسب النوع", "Explore by type")}>
          <h2 className="mb-4 text-sm font-extrabold" style={{ color: "var(--brand-gold-light)" }}>
            {t("استكشف حسب النوع", "Explore by type")}
          </h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5" style={{ color: "var(--text-muted)" }}>
            {(Object.keys(FILTER_LABELS) as FilterCategory[]).map((category) => {
              const Icon = CATEGORY_ICON[category];
              return (
                <li key={category}>
                  <Link href={`/explore?category=${category}`} className={`flex items-center gap-2 ${linkClass}`}>
                    <Icon size={14} />
                    {filterLabel(category, lang)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="border-t px-6 py-5 text-center text-xs" style={{ borderColor: "var(--brand-line)", color: "var(--text-muted)" }}>
        © 2026 Smart Tourism
      </div>
    </footer>
  );
}
