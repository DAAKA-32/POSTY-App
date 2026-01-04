"use client";

import Link from "next/link";
import { ReactNode } from "react";
import PremiumChip, { ProChip, NewChip, BetaChip, CountChip } from "./PremiumChip";

type NavChipType = "pro" | "new" | "beta" | "count";

interface PremiumNavItemProps {
  href: string;
  icon: ReactNode;
  label: string;
  isActive?: boolean;
  chip?: NavChipType;
  chipCount?: number;
  onClick?: () => void;
  className?: string;
}

export default function PremiumNavItem({
  href,
  icon,
  label,
  isActive = false,
  chip,
  chipCount,
  onClick,
  className = "",
}: PremiumNavItemProps) {
  const renderChip = () => {
    switch (chip) {
      case "pro":
        return <ProChip />;
      case "new":
        return <NewChip />;
      case "beta":
        return <BetaChip />;
      case "count":
        return chipCount !== undefined && chipCount > 0 ? <CountChip count={chipCount} /> : null;
      default:
        return null;
    }
  };

  const content = (
    <div
      className={`
        group relative flex items-center gap-3 px-3 py-2.5
        rounded-xl transition-all duration-200
        ${isActive
          ? "bg-primary/15 text-primary"
          : "text-text-secondary hover:text-white hover:bg-dark-hover"
        }
        ${className}
      `}
      onClick={onClick}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
      )}

      {/* Icon */}
      <span
        className={`
          w-5 h-5 shrink-0 transition-transform duration-200
          group-hover:scale-110
        `}
      >
        {icon}
      </span>

      {/* Label */}
      <span className="flex-1 text-sm font-medium truncate">{label}</span>

      {/* Chip */}
      {renderChip()}
    </div>
  );

  if (onClick) {
    return <button className="w-full text-left">{content}</button>;
  }

  return <Link href={href}>{content}</Link>;
}

// Compact version for mobile bottom nav
export function CompactNavItem({
  href,
  icon,
  label,
  isActive = false,
  chip,
  chipCount,
}: Omit<PremiumNavItemProps, "className" | "onClick">) {
  const renderChip = () => {
    switch (chip) {
      case "pro":
        return (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-primary to-accent rounded-full" />
        );
      case "new":
        return (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full animate-pulse" />
        );
      case "count":
        return chipCount !== undefined && chipCount > 0 ? (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {chipCount > 9 ? "9+" : chipCount}
          </span>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <Link
      href={href}
      className={`
        relative flex flex-col items-center gap-1 p-2 min-w-[60px]
        transition-colors duration-200
        ${isActive ? "text-primary" : "text-text-muted hover:text-white"}
      `}
    >
      <span className="relative w-6 h-6">
        {icon}
        {renderChip()}
      </span>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
