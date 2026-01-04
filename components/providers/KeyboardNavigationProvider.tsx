"use client";

import { useEffect } from "react";

/**
 * Provider that adds 'keyboard-nav-active' class to body when user navigates with keyboard.
 * This enables enhanced focus styles for keyboard users while keeping them minimal for mouse users.
 */
export default function KeyboardNavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tab or arrow keys indicate keyboard navigation
      if (e.key === "Tab" || e.key?.startsWith("Arrow")) {
        document.body.classList.add("keyboard-nav-active");
      }
    };

    const handleMouseDown = () => {
      document.body.classList.remove("keyboard-nav-active");
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
      document.body.classList.remove("keyboard-nav-active");
    };
  }, []);

  return <>{children}</>;
}
