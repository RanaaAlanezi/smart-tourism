"use client";

import Link from "next/link";
import Image from "next/image";
import { MapPin, ArrowLeft } from "lucide-react";
import { Landmark } from "@/lib/types";
import { categoryLabel } from "@/lib/categories";
import { useLang } from "@/lib/i18n";

export function MapDetailPanel({ landmark }: { landmark: Landmark | null }) {
  const { lang, t } = useLang();
  if (!landmark) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <MapPin size={22} style={{ color: "var(--text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {t("اضغط على أي علامة على الخريطة لعرض تفاصيل المعلم", "Tap any pin on the map to see the landmark's details")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4">
      {landmark.image && (
        <div className="relative mb-3 h-32 w-full overflow-hidden rounded-xl">
          <Image src={landmark.image} alt={landmark.name} fill className="object-cover" />
        </div>
      )}
      <div className="mb-1 font-bold leading-snug">{landmark.name}</div>
      <div className="mb-2 flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
        <MapPin size={12} />
        {landmark.city} · {categoryLabel(landmark.category, lang)}
      </div>
      <p className="mb-4 line-clamp-3 text-sm" style={{ color: "var(--text-muted)" }}>
        {landmark.summary}
      </p>
      <Link
        href={`/landmarks/${landmark.id}`}
        className="mt-auto flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold"
        style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
      >
        {t("عرض التفاصيل", "View details")}
        <ArrowLeft size={14} />
      </Link>
    </div>
  );
}
