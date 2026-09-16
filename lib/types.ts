export type AgeGroup = "child" | "teen" | "adult";

export interface Landmark {
  id: string;
  name: string;
  category: "heritage" | "nature" | "historic-district" | "urban";
  city: string;
  region: string;
  summary: string;
  facts: string;
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
