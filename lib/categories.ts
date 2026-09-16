import { Landmark as LandmarkIcon, Mountain, Waves, Building2, Palette } from "lucide-react";
import { Landmark } from "./types";

// The Explore/homepage filters use a coarser, Arabic-first grouping than the
// underlying data category, so new data categories can be added later
// without having to touch every filter UI.
export type FilterCategory = "historical" | "natural" | "beach" | "urban" | "cultural";

export const CATEGORY_GROUP: Record<Landmark["category"], FilterCategory> = {
  heritage: "historical",
  "historic-district": "historical",
  nature: "natural",
  urban: "urban",
};

export const FILTER_LABELS: Record<FilterCategory, string> = {
  historical: "تاريخي",
  natural: "طبيعي",
  beach: "شواطئ",
  urban: "حضري",
  cultural: "ثقافي",
};

export const CATEGORY_ICON: Record<FilterCategory, typeof Mountain> = {
  historical: LandmarkIcon,
  natural: Mountain,
  beach: Waves,
  urban: Building2,
  cultural: Palette,
};

export const CATEGORY_LABEL: Record<Landmark["category"], string> = {
  heritage: "موقع تراثي",
  nature: "معلم طبيعي",
  "historic-district": "حي تاريخي",
  urban: "معلم حضري",
};

export const CATEGORY_GRADIENT: Record<Landmark["category"], string> = {
  heritage: "linear-gradient(135deg,#0B5D48,#0E7A5C)",
  nature: "linear-gradient(135deg,#0E4D63,#147A87)",
  "historic-district": "linear-gradient(135deg,#7A4A1E,#B8873B)",
  urban: "linear-gradient(135deg,#1F2937,#C08A34)",
};
