"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    name: "Chat",
    href: "/app",
    activeHrefs: ["/app", "/chat"],
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 transition-colors duration-200 ${active ? "text-primary" : "text-gray-400"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
  {
    name: "Historique",
    href: "/history",
    activeHrefs: ["/history"],
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 transition-colors duration-200 ${active ? "text-primary" : "text-gray-400"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    name: "Profil",
    href: "/profile",
    activeHrefs: ["/profile"],
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 transition-colors duration-200 ${active ? "text-primary" : "text-gray-400"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
];

export default function BottomNavbar() {
  const pathname = usePathname();

  // Don't show on auth pages or on desktop/tablet (lg breakpoint)
  if (pathname === "/login" || pathname === "/signup" || pathname === "/onboarding") {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-dark-card/95 backdrop-blur-sm border-t border-dark-border input-shadow lg:hidden">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {navItems.map((item) => {
          const isActive = item.activeHrefs.includes(pathname);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex flex-col items-center justify-center
                py-2 px-5 rounded-xl
                transition-all duration-200
                active:scale-95
                ${isActive ? "bg-primary/10" : ""}
              `}
            >
              {item.icon(isActive)}
              <span
                className={`
                  text-xs mt-1 font-medium transition-colors duration-200
                  ${isActive ? "text-primary" : "text-gray-400"}
                `}
              >
                {item.name}
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
