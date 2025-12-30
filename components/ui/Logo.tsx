"use client";

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showText?: boolean;
  textSize?: "sm" | "md" | "lg" | "xl" | "2xl";
}

const sizeClasses = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

const textSizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
};

const fallbackTextSize = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-2xl",
};

export default function Logo({
  size = "md",
  className = "",
  showText = false,
  textSize = "lg",
}: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div
        className={`
          ${sizeClasses[size]}
          bg-gradient-to-br from-primary to-accent
          rounded-xl overflow-hidden
          flex items-center justify-center
          shadow-glow transition-transform hover:scale-105
        `}
      >
        <img
          src="/logo.png"
          alt="POSTY Logo"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
            if (sibling) sibling.style.display = "flex";
          }}
        />
        <span
          className={`text-white font-bold hidden ${fallbackTextSize[size]}`}
        >
          P
        </span>
      </div>
      {showText && (
        <span
          className={`font-semibold text-white tracking-tight ${textSizeClasses[textSize]}`}
        >
          POSTY
        </span>
      )}
    </div>
  );
}

// Animated Logo for loading states
export function AnimatedLogo({
  size = "lg",
  className = "",
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div
        className={`
          ${sizeClasses[size]}
          bg-gradient-to-br from-primary to-accent
          rounded-xl overflow-hidden
          flex items-center justify-center
          shadow-glow
          animate-pulse
        `}
      >
        <img
          src="/logo.png"
          alt="POSTY Logo"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
            if (sibling) sibling.style.display = "flex";
          }}
        />
        <span
          className={`text-white font-bold hidden animate-pulse ${fallbackTextSize[size]}`}
        >
          P
        </span>
      </div>
    </div>
  );
}
