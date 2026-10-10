import { Landmark as LandmarkIcon, Mountain, Waves, Building2, Palette, Pickaxe } from "lucide-react";
import { Lang, LandmarkCategory, LandmarkTag } from "./types";

export const FILTER_LABELS: Record<LandmarkCategory, string> = {
  historical: "تاريخي",
  archaeological: "أثري",
  natural: "طبيعي",
  beaches: "شواطئ",
  urban: "حضري",
  cultural: "ثقافي",
};

const FILTER_LABELS_EN: Record<LandmarkCategory, string> = {
  historical: "Historical",
  archaeological: "Archaeological",
  natural: "Nature",
  beaches: "Beaches",
  urban: "Urban",
  cultural: "Cultural",
};

const CATEGORY_LABEL_EN: Record<LandmarkCategory, string> = {
  historical: "Historical site",
  archaeological: "Archaeological site",
  natural: "Natural landmark",
  beaches: "Beach",
  urban: "Urban landmark",
  cultural: "Cultural site",
};

// The short filter name ("تاريخي" / "Historical") in the given language.
export function filterLabel(category: LandmarkCategory, lang: Lang): string {
  return lang === "en" ? FILTER_LABELS_EN[category] : FILTER_LABELS[category];
}

// The descriptive name ("موقع تاريخي" / "Historical site") in the given language.
export function categoryLabel(category: LandmarkCategory, lang: Lang): string {
  return lang === "en" ? CATEGORY_LABEL_EN[category] : CATEGORY_LABEL[category];
}

export const CATEGORY_ICON: Record<LandmarkCategory, typeof Mountain> = {
  historical: LandmarkIcon,
  archaeological: Pickaxe,
  natural: Mountain,
  beaches: Waves,
  urban: Building2,
  cultural: Palette,
};

export const CATEGORY_LABEL: Record<LandmarkCategory, string> = {
  historical: "موقع تاريخي",
  archaeological: "موقع أثري",
  natural: "معلم طبيعي",
  beaches: "شاطئ",
  urban: "معلم حضري",
  cultural: "موقع ثقافي",
};

export const CATEGORY_GRADIENT: Record<LandmarkCategory, string> = {
  historical: "linear-gradient(135deg,#7A4A1E,#B8873B)",
  archaeological: "linear-gradient(135deg,#5C4B32,#8A7350)",
  natural: "linear-gradient(135deg,#0E4D63,#147A87)",
  beaches: "linear-gradient(135deg,#0B5D6E,#1AA6A0)",
  urban: "linear-gradient(135deg,#1F2937,#C08A34)",
  cultural: "linear-gradient(135deg,#0B5D48,#0E7A5C)",
};

// Map pin color per category — bright enough to read on the dark-green
// landmass, and reused to tint the map's category filter icons so the
// filter list doubles as the map legend.
export const CATEGORY_PIN_COLOR: Record<LandmarkCategory, string> = {
  historical: "#E4B04A",
  archaeological: "#D9825B",
  natural: "#8FD16B",
  beaches: "#4FD0D6",
  urban: "#B9A7F2",
  cultural: "#F29BB8",
};

// Kept as an alias so existing imports of `FilterCategory` keep working —
// it's now exactly the data category, not a coarser grouping of it.
export type FilterCategory = LandmarkCategory;

// Display labels for optional landmark tags (see LandmarkTag) — used only
// for a small badge on cards/detail pages and for search, never rendered
// as an Explore filter option.
export const TAG_LABELS: Record<LandmarkTag, { ar: string; en: string; emoji: string }> = {
  religious: { ar: "ديني", en: "Religious", emoji: "🕌" },
};
