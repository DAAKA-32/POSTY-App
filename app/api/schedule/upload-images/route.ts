import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { isAdminInitialized, getAdminStorageBucket } from "@/lib/db/firebase-admin";
import { checkUserQuotaAdmin } from "@/lib/db/firestore-admin";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGES = 9;

/**
 * Inspect a file's first bytes to determine its real format, regardless of
 * what the client claims in `file.type`. Returns null if the buffer doesn't
 * match a supported image format — that's our cue to reject the upload as
 * a likely disguised file.
 */
function detectImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "image/png";
  // GIF: 47 49 46 38 (37|39) 61  →  GIF87a / GIF89a
  if (
    buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61
  ) return "image/gif";
  // WebP: "RIFF" .... "WEBP"
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  return null;
}

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

    // Server-side plan check: only Max plan can upload media for scheduled posts
    // Log plan for debugging, but allow pro+ plans to avoid false rejections
    // (frontend already hides upload buttons for non-Max users)
    try {
      const quota = await checkUserQuotaAdmin(userId, auth.email);
      console.log(`[upload-images] userId=${userId} plan=${quota.plan}`);
      if (!quota.plan || quota.plan === "free") {
        return NextResponse.json(
          { error: "plan_restricted", message: "Media uploads for scheduled posts require a paid plan." },
          { status: 403 }
        );
      }
    } catch (err) {
      // Log but don't block — frontend already gates access
      console.warn("[upload-images] Plan check failed, allowing upload:", err);
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

      // Magic-byte validation — `file.type` is client-supplied and trivially
      // spoofed. Reject anything whose actual header doesn't match a supported
      // image format, or where the real format disagrees with the declared
      // MIME type (e.g. a .jpg masquerading as image/png).
      const actualMime = detectImageMime(buffer);
      if (!actualMime || actualMime !== file.type) {
        return NextResponse.json(
          { error: "invalid_type", message: "Image content does not match its declared type." },
          { status: 400 }
        );
      }

      // Build storage path
      const extension = file.name.split(".").pop() || "jpg";
      const filename = `${i}_${Date.now()}.${extension}`;
      const storagePath = `scheduled-posts/${userId}/${scheduledPostId}/${filename}`;

      // Upload to Firebase Storage via Admin SDK (no CORS)
      const fileRef = bucket.file(storagePath);
      await fileRef.save(buffer, {
        metadata: {
          contentType: actualMime,
          metadata: {
            uploadedBy: userId,
            scheduledPostId,
            originalName: file.name,
          },
        },
      });

      // Generate a signed URL for preview (valid 7 days — covers max scheduling window)
      // The Cloud Function uses Admin SDK download (not this URL) for publishing
      let downloadURL: string;
      try {
        await fileRef.makePublic();
        downloadURL = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
      } catch {
        // Uniform Bucket-Level Access may block makePublic — use signed URL instead
        const [signedUrl] = await fileRef.getSignedUrl({
          action: "read",
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        downloadURL = signedUrl;
      }

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
