import { Landmark as LandmarkIcon, Mountain, Waves, Building2, Palette, Pickaxe } from "lucide-react";
import { LandmarkCategory } from "./types";

export const FILTER_LABELS: Record<LandmarkCategory, string> = {
  historical: "تاريخي",
  archaeological: "أثري",
  natural: "طبيعي",
  beaches: "شواطئ",
  urban: "حضري",
  cultural: "ثقافي",
};

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

// Kept as an alias so existing imports of `FilterCategory` keep working —
// it's now exactly the data category, not a coarser grouping of it.
export type FilterCategory = LandmarkCategory;
