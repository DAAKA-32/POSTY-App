"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

const navItems = [
  {
    nameKey: "chat" as const,
    href: "/app",
    activeHrefs: ["/app", "/chat"],
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 transition-all duration-200 ${active ? "text-primary scale-110" : "text-gray-400 dark:text-gray-500"}`}
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 0 : 2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
  {
    nameKey: "history" as const,
    href: "/history",
    activeHrefs: ["/history"],
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 transition-all duration-200 ${active ? "text-cyan-500 scale-110" : "text-gray-400 dark:text-gray-500"}`}
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 0 : 2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    nameKey: "schedule" as const,
    href: "/schedule",
    activeHrefs: ["/schedule"],
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 transition-all duration-200 ${active ? "text-violet-500 scale-110" : "text-gray-400 dark:text-gray-500"}`}
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 0 : 2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    nameKey: "analytics" as const,
    href: "/analytics",
    activeHrefs: ["/analytics"],
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 transition-all duration-200 ${active ? "text-emerald-500 scale-110" : "text-gray-400 dark:text-gray-500"}`}
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 0 : 2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
];

// Active accent colors per nav item
const activeColors: Record<string, string> = {
  chat: "text-primary",
  history: "text-cyan-500",
  schedule: "text-violet-500",
  analytics: "text-emerald-500",
};

export default function BottomNavbar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  // Hide on auth pages, chat pages (has fixed input), and on desktop/tablet
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/onboarding" ||
    pathname === "/app" ||
    pathname.startsWith("/app/c/") ||
    pathname === "/chat"
  ) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border lg:hidden">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {navItems.map((item) => {
          const isActive = item.activeHrefs.some(
            (h) => pathname === h || pathname.startsWith(h + "/")
          );
          const label = t.nav[item.nameKey];

          return (
            <Link
              key={item.nameKey}
              href={item.href}
              className={`
                relative flex flex-col items-center justify-center
                min-w-[48px] min-h-[48px] px-3 rounded-xl
                transition-all duration-200
                active:scale-95
                ${isActive
                  ? "bg-primary/10 dark:bg-primary/10 before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:w-6 before:h-1 before:bg-primary before:rounded-full"
                  : ""
                }
              `}
            >
              {item.icon(isActive)}
              <span
                className={`
                  text-2xs mt-0.5 font-medium transition-colors duration-200
                  ${isActive ? activeColors[item.nameKey] : "text-gray-400 dark:text-gray-500"}
                `}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area spacer for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
