import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

export async function uploadLandmarkImage(file: File, landmarkId: string): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `landmarks/${landmarkId}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
