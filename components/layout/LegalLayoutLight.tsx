"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface LegalLayoutLightProps {
  children: ReactNode;
  title: string;
}

const legalLinks = [
  { name: "Politique de confidentialite", href: "/legal/privacy" },
  { name: "Conditions d'utilisation", href: "/legal/terms" },
  { name: "Mentions legales", href: "/legal/notices" },
];

export default function LegalLayoutLight({ children, title }: LegalLayoutLightProps) {
  const pathname = usePathname();

  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: "Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        backgroundColor: "#ffffff",
        color: "#1a1a1a",
      }}
    >
      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e5e5e5",
        }}
      >
        <div
          style={{
            maxWidth: "960px",
            margin: "0 auto",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                background: "linear-gradient(135deg, #2F80ED 0%, #00D1C1 100%)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <img
                src="/logo.png"
                alt="POSTY"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (sibling) sibling.style.display = "flex";
                }}
              />
              <span
                style={{
                  display: "none",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "18px",
                }}
              >
                P
              </span>
            </div>
            <span
              style={{
                fontWeight: 600,
                fontSize: "18px",
                color: "#1a1a1a",
              }}
            >
              POSTY
            </span>
          </Link>

          {/* Return button */}
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              fontSize: "14px",
              color: "#2F80ED",
              backgroundColor: "#f5f5f5",
              borderRadius: "6px",
              textDecoration: "none",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e5e5e5")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
          >
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Retour a l'application
          </Link>
        </div>
      </header>

      {/* Navigation tabs */}
      <nav
        style={{
          borderBottom: "1px solid #e5e5e5",
          backgroundColor: "#fafafa",
        }}
      >
        <div
          style={{
            maxWidth: "960px",
            margin: "0 auto",
            padding: "0 24px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              padding: "12px 0",
            }}
          >
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  fontWeight: pathname === link.href ? 600 : 400,
                  whiteSpace: "nowrap",
                  borderRadius: "6px",
                  textDecoration: "none",
                  color: pathname === link.href ? "#2F80ED" : "#666666",
                  backgroundColor: pathname === link.href ? "#e8f0fe" : "transparent",
                  transition: "all 0.2s",
                }}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          padding: "40px 24px 80px",
        }}
      >
        {/* Page title */}
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "#1a1a1a",
              marginBottom: "8px",
              lineHeight: 1.3,
            }}
          >
            {title}
          </h1>
          <div
            style={{
              width: "60px",
              height: "3px",
              backgroundColor: "#2F80ED",
              borderRadius: "2px",
            }}
          />
        </div>

        {/* Content */}
        <div
          style={{
            fontSize: "15px",
            lineHeight: 1.7,
            color: "#333333",
          }}
        >
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid #e5e5e5",
          backgroundColor: "#fafafa",
          marginTop: "auto",
        }}
      >
        <div
          style={{
            maxWidth: "960px",
            margin: "0 auto",
            padding: "32px 24px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            {/* Logo and copyright */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  background: "linear-gradient(135deg, #2F80ED 0%, #00D1C1 100%)",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <img
                  src="/logo.png"
                  alt="POSTY"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                    if (sibling) sibling.style.display = "flex";
                  }}
                />
                <span
                  style={{
                    display: "none",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "12px",
                  }}
                >
                  P
                </span>
              </div>
              <span style={{ fontSize: "13px", color: "#666666" }}>
                © {new Date().getFullYear()} POSTY. Tous droits reserves.
              </span>
            </div>

            {/* Legal links */}
            <div
              style={{
                display: "flex",
                gap: "24px",
                fontSize: "13px",
              }}
            >
              <Link
                href="/legal/privacy"
                style={{
                  color: "#666666",
                  textDecoration: "none",
                }}
              >
                Confidentialite
              </Link>
              <Link
                href="/legal/terms"
                style={{
                  color: "#666666",
                  textDecoration: "none",
                }}
              >
                CGU
              </Link>
              <Link
                href="/legal/notices"
                style={{
                  color: "#666666",
                  textDecoration: "none",
                }}
              >
                Mentions legales
              </Link>
            </div>

            {/* Contact */}
            <p style={{ fontSize: "12px", color: "#999999", marginTop: "8px" }}>
              Contact RGPD : privacy@posty.app
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
