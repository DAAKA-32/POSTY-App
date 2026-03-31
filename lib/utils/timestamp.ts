/**
 * Centralized Firestore timestamp conversion utility.
 * Handles Firestore Timestamp objects, Date objects, strings, and numbers.
 *
 * Replaces the repeated pattern:
 *   typeof (timestamp as { toDate?: () => Date }).toDate === "function"
 *     ? (timestamp as { toDate: () => Date }).toDate()
 *     : new Date(timestamp as unknown as string)
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TimestampLike = any;

/**
 * Convert any Firestore-compatible timestamp value to a JS Date.
 * Returns `new Date()` for null/undefined inputs.
 */
export function toDate(timestamp: TimestampLike): Date {
  if (!timestamp) return new Date();

  if (timestamp instanceof Date) {
    return timestamp;
  }

  if (
    typeof timestamp === "object" &&
    "toDate" in timestamp &&
    typeof timestamp.toDate === "function"
  ) {
    return timestamp.toDate();
  }

  if (typeof timestamp === "string" || typeof timestamp === "number") {
    return new Date(timestamp);
  }

  return new Date();
}
