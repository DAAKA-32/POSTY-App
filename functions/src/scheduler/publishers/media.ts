import { PublishError } from "../errors";
import type { ScheduledPostImage } from "../types";
import type { PublishContext } from "./types";

/**
 * `scheduledPosts` docs can be created client-side, so `images[].storagePath`
 * is user input. The scheduler reads (and afterwards deletes) files with
 * Admin privileges, so a path outside the owner's own folders would let one
 * user publish or delete another user's files. Only the two owner-scoped
 * prefixes from storage.rules are accepted.
 */
export function isOwnedStoragePath(storagePath: unknown, userId: string): boolean {
  if (typeof storagePath !== "string" || !userId || storagePath.includes("..")) return false;
  return storagePath.startsWith(`scheduled-posts/${userId}/`) || storagePath.startsWith(`users/${userId}/`);
}

export function assertOwnedImagePaths(ctx: PublishContext): void {
  const foreign = ctx.images.filter((img) => !isOwnedStoragePath(img.storagePath, ctx.userId));
  if (foreign.length > 0) {
    throw new PublishError({
      code: "INVALID_POST_DATA",
      platform: ctx.platform,
      detail: `${foreign.length} image path(s) outside the owner's storage folders`,
    });
  }
}

/**
 * Only files uploaded specifically for this scheduled post are temporary.
 * Anything else (e.g. Strategist visuals under users/{uid}/generated-images/)
 * belongs to the user's library and must survive publication.
 */
export function isTemporaryScheduledUpload(image: ScheduledPostImage, userId: string, postId: string): boolean {
  return (
    typeof image.storagePath === "string" &&
    !image.storagePath.includes("..") &&
    image.storagePath.startsWith(`scheduled-posts/${userId}/${postId}/`)
  );
}
