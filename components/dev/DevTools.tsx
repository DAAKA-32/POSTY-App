"use client";

import dynamic from "next/dynamic";

// Dynamically import ValidationPanel only in development
const ValidationPanel = dynamic(
  () => import("./ValidationPanel"),
  { ssr: false }
);

/**
 * Client-side wrapper for dev tools
 * Only renders in development mode
 */
export default function DevTools() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return <ValidationPanel />;
}
