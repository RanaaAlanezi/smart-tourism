export type AgeGroup = "child" | "teen" | "adult";

export interface Landmark {
  id: string;
  name: string;
  category: "heritage" | "nature" | "historic-district" | "urban";
  city: string;
  region: string;
  summary: string;
  facts: string;
  // Short "Label: value" lines (English labels, e.g. "Height: 302 meters")
  // used only as AI grounding context — not shown in the UI. The local
  // quantized Qwen model reliably garbles numbers/names pulled from a
  // flowing prose paragraph (e.g. reading "302 meters" as "302 months")
  // but handles them correctly when they're given as short labeled facts.
  keyFacts?: string;
  image: string | null;
  latitude: number;
  longitude: number;
}

export interface Interaction {
  id?: string;
  landmarkId: string;
  landmarkName: string;
  ageGroup: AgeGroup;
  userId: string;
  createdAt: number;
}
