import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { isAdminInitialized, getAdminStorageBucket } from "@/lib/db/firebase-admin";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGES = 9;

/**
 * Server-side image upload for scheduled posts.
 * Bypasses CORS issues by uploading from the server to Firebase Storage.
 *
 * Expects FormData with:
 * - scheduledPostId: string
 * - images: File[] (up to 9)
 *
 * Returns: { images: Array<{ storagePath, downloadURL, fileName, contentType, size }> }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    if (!isAdminInitialized()) {
      return NextResponse.json(
        { error: "firebase_not_initialized", message: "Service temporarily unavailable." },
        { status: 503 }
      );
    }

    const bucket = getAdminStorageBucket();
    if (!bucket) {
      return NextResponse.json(
        { error: "storage_not_available", message: "Storage service unavailable." },
        { status: 503 }
      );
    }

    // Parse FormData
    const formData = await request.formData();
    const scheduledPostId = formData.get("scheduledPostId") as string;
    const bodyUserId = formData.get("userId") as string;
    const imageFiles = formData.getAll("images") as File[];

    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;

    if (!userId || !scheduledPostId) {
      return NextResponse.json(
        { error: "missing_fields", message: "Missing required fields: userId, scheduledPostId." },
        { status: 400 }
      );
    }

    if (imageFiles.length === 0) {
      return NextResponse.json(
        { error: "no_images", message: "No images provided." },
        { status: 400 }
      );
    }

    if (imageFiles.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: "too_many_images", message: `Maximum ${MAX_IMAGES} images allowed.` },
        { status: 400 }
      );
    }

    // Validate and upload each image
    const uploadedImages: Array<{
      storagePath: string;
      downloadURL: string;
      fileName: string;
      contentType: string;
      size: number;
    }> = [];

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: "invalid_type", message: `Unsupported image format: ${file.type}` },
          { status: 400 }
        );
      }

      // Validate size
      if (file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: "image_too_large", message: `Image too large (max ${MAX_IMAGE_SIZE / 1024 / 1024} MB).` },
          { status: 400 }
        );
      }

      // Read file buffer
      const buffer = Buffer.from(await file.arrayBuffer());

      // Build storage path
      const extension = file.name.split(".").pop() || "jpg";
      const filename = `${i}_${Date.now()}.${extension}`;
      const storagePath = `scheduled-posts/${userId}/${scheduledPostId}/${filename}`;

      // Upload to Firebase Storage via Admin SDK (no CORS)
      const fileRef = bucket.file(storagePath);
      await fileRef.save(buffer, {
        metadata: {
          contentType: file.type,
          metadata: {
            uploadedBy: userId,
            scheduledPostId,
            originalName: file.name,
          },
        },
      });

      // Make file publicly readable (or use signed URL)
      await fileRef.makePublic();
      const downloadURL = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

      uploadedImages.push({
        storagePath,
        downloadURL,
        fileName: file.name,
        contentType: file.type,
        size: file.size,
      });
    }

    return NextResponse.json({ images: uploadedImages });
  } catch (error) {
    console.error("[schedule/upload-images] Error:", error);
    return NextResponse.json(
      { error: "upload_failed", message: "Image upload failed. Please try again." },
      { status: 500 }
    );
  }
}
