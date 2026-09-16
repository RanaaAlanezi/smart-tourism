import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Landmark } from "@/lib/types";

export async function getLandmarks(): Promise<Landmark[]> {
  const snapshot = await getDocs(collection(db, "landmarks"));
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Landmark, "id">) }));
}

export async function getLandmark(id: string): Promise<Landmark | null> {
  const snap = await getDoc(doc(db, "landmarks", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Landmark, "id">) };
}
