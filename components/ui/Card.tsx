"use client";

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export default function Card({
  children,
  className = "",
  onClick,
  hover = false,
  padding = "md",
}: CardProps) {
  const paddingStyles = {
    none: "",
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  return (
    <div
      onClick={onClick}
      className={`
        bg-dark-card
        border border-dark-border
        rounded-xl
        ${paddingStyles[padding]}
        ${hover ? "hover:bg-dark-hover hover:border-gray-600 cursor-pointer transition-all duration-200" : ""}
        ${onClick ? "cursor-pointer" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// Header variant for cards with title
interface CardHeaderProps {
  title: string;
  action?: ReactNode;
}

export function CardHeader({ title, action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {action}
    </div>
  );
}
