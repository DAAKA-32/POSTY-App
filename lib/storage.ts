/**
 * Firebase Storage utilities for profile images
 */

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import app from "./firebase";

// Initialize Firebase Storage
const storage = getStorage(app);

/**
 * Upload a profile image (avatar or cover)
 * @param userId - The user's ID
 * @param file - The image file to upload
 * @param type - "avatar" or "cover"
 * @returns The download URL of the uploaded image
 */
export async function uploadProfileImage(
  userId: string,
  file: File,
  type: "avatar" | "cover"
): Promise<string> {
  // Validate file type
  if (!file.type.startsWith("image/")) {
    throw new Error("Le fichier doit etre une image");
  }

  // Validate file size (max 5MB for avatar, 10MB for cover)
  const maxSize = type === "avatar" ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(
      `L'image est trop grande. Maximum ${type === "avatar" ? "5" : "10"}MB.`
    );
  }

  // Create a unique filename with timestamp
  const extension = file.name.split(".").pop() || "jpg";
  const filename = `${type}_${Date.now()}.${extension}`;
  const path = `users/${userId}/${type}/${filename}`;

  // Create storage reference
  const storageRef = ref(storage, path);

  // Upload file
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
    },
  });

  // Get download URL
  const downloadURL = await getDownloadURL(snapshot.ref);

  return downloadURL;
}

/**
 * Delete a profile image
 * @param imageUrl - The URL of the image to delete
 */
export async function deleteProfileImage(imageUrl: string): Promise<void> {
  try {
    // Extract the path from the URL
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
  } catch (error) {
    // Ignore errors if file doesn't exist
    console.warn("Could not delete image:", error);
  }
}

/**
 * Compress and resize an image before upload
 * @param file - The original image file
 * @param maxWidth - Maximum width in pixels
 * @param maxHeight - Maximum height in pixels
 * @param quality - JPEG quality (0-1)
 * @returns A compressed Blob
 */
export async function compressImage(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Create canvas and draw resized image
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Could not compress image"));
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("Could not load image"));
    };
    reader.onerror = () => reject(new Error("Could not read file"));
  });
}

/**
 * Create a cropped version of an image
 * @param file - The original image file
 * @param cropArea - The crop area { x, y, width, height } in percentages (0-100)
 * @returns A cropped Blob
 */
export async function cropImage(
  file: File,
  cropArea: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Calculate crop dimensions in pixels
        const cropX = (cropArea.x / 100) * img.width;
        const cropY = (cropArea.y / 100) * img.height;
        const cropWidth = (cropArea.width / 100) * img.width;
        const cropHeight = (cropArea.height / 100) * img.height;

        // Create canvas with crop dimensions
        const canvas = document.createElement("canvas");
        canvas.width = cropWidth;
        canvas.height = cropHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Draw cropped portion
        ctx.drawImage(
          img,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          0,
          0,
          cropWidth,
          cropHeight
        );

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Could not crop image"));
            }
          },
          "image/jpeg",
          0.9
        );
      };
      img.onerror = () => reject(new Error("Could not load image"));
    };
    reader.onerror = () => reject(new Error("Could not read file"));
  });
}
