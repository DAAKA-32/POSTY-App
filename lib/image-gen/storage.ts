/**
 * Uploads a rendered PNG to Firebase Storage and returns a long-lived
 * download URL. Lives under `users/{uid}/generated-images/{id}.png` so the
 * existing storage.rules per-user prefix policy applies unchanged.
 */

import { getAdminStorageBucket } from "@/lib/db/firebase-admin";

export interface UploadResult {
  url: string;
  path: string;
  imageId: string;
}

export async function uploadGeneratedImage(
  userId: string,
  png: Buffer
): Promise<UploadResult> {
  const bucket = getAdminStorageBucket();
  if (!bucket) {
    throw new Error("Firebase Storage bucket unavailable (admin not initialized).");
  }

  const imageId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const path = `users/${userId}/generated-images/${imageId}.png`;
  const file = bucket.file(path);

  await file.save(png, {
    contentType: "image/png",
    metadata: {
      cacheControl: "public, max-age=31536000, immutable",
      // Pre-shared token used by Firebase's public download URL format.
      // Stored on the metadata so the URL stays stable across reads.
      metadata: { firebaseStorageDownloadTokens: imageId },
    },
    resumable: false, // single shot — PNGs are < 1 MB
  });

  // Public Firebase Storage download URL pattern (no extra signing).
  const encodedPath = encodeURIComponent(path);
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${imageId}`;

  return { url, path, imageId };
}
