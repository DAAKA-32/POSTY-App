/**
 * Posty Illustration System
 *
 * Consistent illustration components following the Posty brand style:
 * - Flat design with soft shadows
 * - Brand color palette only (#F8935D, #F76B54, #FBB9AD, #F13452)
 * - Rounded geometric shapes
 * - Minimalist and cohesive
 *
 * @example
 * import { EmptyStateIllustration, GenerateIllustration } from '@/components/ui/illustrations';
 *
 * <EmptyStateIllustration size="lg" />
 */

import React from "react";
import { motion } from "framer-motion";

// Illustration props interface
export interface IllustrationProps extends React.SVGProps<SVGSVGElement> {
  size?: "sm" | "md" | "lg" | "xl" | number;
  animate?: boolean;
}

// Size mapping
const sizeMap = {
  sm: 120,
  md: 160,
  lg: 200,
  xl: 280,
};

// Helper to get size
const getSize = (size: IllustrationProps["size"]) => {
  if (typeof size === "number") return size;
  return sizeMap[size || "md"];
};

// Brand colors
const colors = {
  primary: "#F8935D",
  secondary: "#F76B54",
  tertiary: "#FBB9AD",
  accent: "#F13452",
  light: "#FEF3EE",
  dark: "#1A1D21",
  white: "#FFFFFF",
  shadow: "rgba(248, 147, 93, 0.2)",
};

/**
 * EmptyStateIllustration - For empty lists/states
 * Document with magnifying glass
 */
export const EmptyStateIllustration: React.FC<IllustrationProps> = ({
  size = "md",
  animate = true,
  className = "",
  ...props
}) => {
  const s = getSize(size);

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Background circle */}
      <circle cx="100" cy="100" r="80" fill={colors.light} />

      {/* Document */}
      <motion.g
        initial={animate ? { y: 5 } : {}}
        animate={animate ? { y: [5, -5, 5] } : {}}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <rect x="55" y="45" width="70" height="90" rx="8" fill={colors.white} filter="url(#shadow1)" />
        <rect x="65" y="60" width="40" height="6" rx="3" fill={colors.tertiary} />
        <rect x="65" y="72" width="50" height="6" rx="3" fill={colors.tertiary} />
        <rect x="65" y="84" width="35" height="6" rx="3" fill={colors.tertiary} />
        <rect x="65" y="100" width="45" height="6" rx="3" fill={colors.tertiary} />
        <rect x="65" y="112" width="30" height="6" rx="3" fill={colors.tertiary} />
      </motion.g>

      {/* Magnifying glass */}
      <motion.g
        initial={animate ? { scale: 1 } : {}}
        animate={animate ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      >
        <circle cx="130" cy="120" r="25" stroke={colors.primary} strokeWidth="6" fill={colors.white} />
        <line x1="148" y1="138" x2="165" y2="155" stroke={colors.primary} strokeWidth="6" strokeLinecap="round" />
      </motion.g>

      {/* Sparkles */}
      <motion.circle
        cx="60"
        cy="50"
        r="4"
        fill={colors.secondary}
        initial={animate ? { opacity: 0.5 } : {}}
        animate={animate ? { opacity: [0.5, 1, 0.5] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.circle
        cx="155"
        cy="70"
        r="3"
        fill={colors.accent}
        initial={animate ? { opacity: 0.5 } : {}}
        animate={animate ? { opacity: [0.5, 1, 0.5] } : {}}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
      />

      <defs>
        <filter id="shadow1" x="45" y="40" width="90" height="105" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor={colors.shadow} floodOpacity="0.3" />
        </filter>
      </defs>
    </svg>
  );
};

/**
 * GenerateIllustration - For content generation
 * Magic wand with sparkles
 */
export const GenerateIllustration: React.FC<IllustrationProps> = ({
  size = "md",
  animate = true,
  className = "",
  ...props
}) => {
  const s = getSize(size);

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Background circle */}
      <circle cx="100" cy="100" r="80" fill={colors.light} />

      {/* Magic wand */}
      <motion.g
        initial={animate ? { rotate: -5 } : {}}
        animate={animate ? { rotate: [-5, 5, -5] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "100px 100px" }}
      >
        <rect x="70" y="85" width="80" height="16" rx="8" fill={colors.primary} filter="url(#shadow2)" transform="rotate(-30 100 100)" />
        <rect x="70" y="85" width="20" height="16" rx="8" fill={colors.secondary} transform="rotate(-30 100 100)" />
      </motion.g>

      {/* Sparkles */}
      <motion.g
        initial={animate ? { opacity: 0, scale: 0 } : {}}
        animate={animate ? { opacity: [0, 1, 0], scale: [0, 1, 0] } : {}}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
      >
        <path d="M50 60L53 67L60 70L53 73L50 80L47 73L40 70L47 67L50 60Z" fill={colors.secondary} />
      </motion.g>

      <motion.g
        initial={animate ? { opacity: 0, scale: 0 } : {}}
        animate={animate ? { opacity: [0, 1, 0], scale: [0, 1, 0] } : {}}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
      >
        <path d="M75 40L77 45L82 47L77 49L75 54L73 49L68 47L73 45L75 40Z" fill={colors.accent} />
      </motion.g>

      <motion.g
        initial={animate ? { opacity: 0, scale: 0 } : {}}
        animate={animate ? { opacity: [0, 1, 0], scale: [0, 1, 0] } : {}}
        transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
      >
        <path d="M55 95L58 102L65 105L58 108L55 115L52 108L45 105L52 102L55 95Z" fill={colors.primary} />
      </motion.g>

      {/* Text lines (generated content) */}
      <motion.g
        initial={animate ? { opacity: 0, x: 20 } : {}}
        animate={animate ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <rect x="100" y="120" width="60" height="8" rx="4" fill={colors.tertiary} />
        <rect x="100" y="134" width="50" height="8" rx="4" fill={colors.tertiary} />
        <rect x="100" y="148" width="40" height="8" rx="4" fill={colors.tertiary} />
      </motion.g>

      <defs>
        <filter id="shadow2" x="55" y="55" width="120" height="80" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={colors.shadow} floodOpacity="0.4" />
        </filter>
      </defs>
    </svg>
  );
};

/**
 * ScheduleIllustration - For scheduling features
 * Calendar with clock
 */
export const ScheduleIllustration: React.FC<IllustrationProps> = ({
  size = "md",
  animate = true,
  className = "",
  ...props
}) => {
  const s = getSize(size);

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Background */}
      <circle cx="100" cy="100" r="80" fill={colors.light} />

      {/* Calendar */}
      <rect x="45" y="50" width="80" height="90" rx="10" fill={colors.white} filter="url(#shadow3)" />
      <rect x="45" y="50" width="80" height="25" rx="10" fill={colors.primary} />
      <rect x="45" y="65" width="80" height="10" fill={colors.primary} />

      {/* Calendar binding */}
      <rect x="60" y="42" width="8" height="20" rx="4" fill={colors.secondary} />
      <rect x="102" y="42" width="8" height="20" rx="4" fill={colors.secondary} />

      {/* Calendar days */}
      <g fill={colors.tertiary}>
        <rect x="55" y="82" width="12" height="12" rx="3" />
        <rect x="72" y="82" width="12" height="12" rx="3" />
        <rect x="89" y="82" width="12" height="12" rx="3" />
        <rect x="106" y="82" width="12" height="12" rx="3" />
        <rect x="55" y="100" width="12" height="12" rx="3" />
        <rect x="72" y="100" width="12" height="12" rx="3" />
        <rect x="106" y="100" width="12" height="12" rx="3" />
        <rect x="55" y="118" width="12" height="12" rx="3" />
        <rect x="72" y="118" width="12" height="12" rx="3" />
        <rect x="89" y="118" width="12" height="12" rx="3" />
        <rect x="106" y="118" width="12" height="12" rx="3" />
      </g>

      {/* Highlighted day */}
      <rect x="89" y="100" width="12" height="12" rx="3" fill={colors.accent} />

      {/* Clock */}
      <motion.g
        initial={animate ? { scale: 1 } : {}}
        animate={animate ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <circle cx="140" cy="130" r="30" fill={colors.white} filter="url(#shadow3)" />
        <circle cx="140" cy="130" r="25" stroke={colors.primary} strokeWidth="3" fill="none" />

        {/* Clock hands */}
        <motion.line
          x1="140"
          y1="130"
          x2="140"
          y2="115"
          stroke={colors.dark}
          strokeWidth="3"
          strokeLinecap="round"
          initial={animate ? { rotate: 0 } : {}}
          animate={animate ? { rotate: 360 } : {}}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "140px 130px" }}
        />
        <motion.line
          x1="140"
          y1="130"
          x2="155"
          y2="130"
          stroke={colors.secondary}
          strokeWidth="2"
          strokeLinecap="round"
          initial={animate ? { rotate: 0 } : {}}
          animate={animate ? { rotate: 360 } : {}}
          transition={{ duration: 3600, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "140px 130px" }}
        />
        <circle cx="140" cy="130" r="4" fill={colors.primary} />
      </motion.g>

      <defs>
        <filter id="shadow3" x="35" y="38" width="150" height="140" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor={colors.shadow} floodOpacity="0.3" />
        </filter>
      </defs>
    </svg>
  );
};

/**
 * AnalyticsIllustration - For statistics/insights
 * Chart with upward trend
 */
export const AnalyticsIllustration: React.FC<IllustrationProps> = ({
  size = "md",
  animate = true,
  className = "",
  ...props
}) => {
  const s = getSize(size);

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Background */}
      <circle cx="100" cy="100" r="80" fill={colors.light} />

      {/* Chart background */}
      <rect x="40" y="50" width="120" height="100" rx="10" fill={colors.white} filter="url(#shadow4)" />

      {/* Grid lines */}
      <g stroke={colors.tertiary} strokeWidth="1" opacity="0.5">
        <line x1="50" y1="80" x2="150" y2="80" />
        <line x1="50" y1="100" x2="150" y2="100" />
        <line x1="50" y1="120" x2="150" y2="120" />
      </g>

      {/* Bars */}
      <motion.rect
        x="55"
        y="100"
        width="15"
        height="40"
        rx="4"
        fill={colors.tertiary}
        initial={animate ? { height: 0, y: 140 } : {}}
        animate={animate ? { height: 40, y: 100 } : {}}
        transition={{ duration: 0.5, delay: 0.1 }}
      />
      <motion.rect
        x="77"
        y="85"
        width="15"
        height="55"
        rx="4"
        fill={colors.tertiary}
        initial={animate ? { height: 0, y: 140 } : {}}
        animate={animate ? { height: 55, y: 85 } : {}}
        transition={{ duration: 0.5, delay: 0.2 }}
      />
      <motion.rect
        x="99"
        y="70"
        width="15"
        height="70"
        rx="4"
        fill={colors.primary}
        initial={animate ? { height: 0, y: 140 } : {}}
        animate={animate ? { height: 70, y: 70 } : {}}
        transition={{ duration: 0.5, delay: 0.3 }}
      />
      <motion.rect
        x="121"
        y="60"
        width="15"
        height="80"
        rx="4"
        fill={colors.secondary}
        initial={animate ? { height: 0, y: 140 } : {}}
        animate={animate ? { height: 80, y: 60 } : {}}
        transition={{ duration: 0.5, delay: 0.4 }}
      />

      {/* Trend arrow */}
      <motion.g
        initial={animate ? { opacity: 0, y: 10 } : {}}
        animate={animate ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <path
          d="M145 55L155 45L165 55M155 45V65"
          stroke={colors.accent}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.g>

      {/* Percentage */}
      <motion.text
        x="155"
        y="80"
        fontSize="14"
        fontWeight="bold"
        fill={colors.accent}
        textAnchor="middle"
        initial={animate ? { opacity: 0 } : {}}
        animate={animate ? { opacity: 1 } : {}}
        transition={{ delay: 0.8 }}
      >
        +24%
      </motion.text>

      <defs>
        <filter id="shadow4" x="30" y="45" width="140" height="120" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor={colors.shadow} floodOpacity="0.3" />
        </filter>
      </defs>
    </svg>
  );
};

/**
 * SuccessIllustration - For success states
 * Checkmark with confetti
 */
export const SuccessIllustration: React.FC<IllustrationProps> = ({
  size = "md",
  animate = true,
  className = "",
  ...props
}) => {
  const s = getSize(size);

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Background */}
      <circle cx="100" cy="100" r="80" fill={colors.light} />

      {/* Main circle */}
      <motion.circle
        cx="100"
        cy="100"
        r="50"
        fill={colors.primary}
        filter="url(#shadow5)"
        initial={animate ? { scale: 0 } : {}}
        animate={animate ? { scale: 1 } : {}}
        transition={{ duration: 0.4, type: "spring" }}
      />

      {/* Checkmark */}
      <motion.path
        d="M75 100L92 117L125 84"
        stroke={colors.white}
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={animate ? { pathLength: 0 } : {}}
        animate={animate ? { pathLength: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.3 }}
      />

      {/* Confetti */}
      <motion.circle
        cx="50"
        cy="50"
        r="6"
        fill={colors.secondary}
        initial={animate ? { opacity: 0, y: 20 } : {}}
        animate={animate ? { opacity: [0, 1, 0], y: [20, -10, -30] } : {}}
        transition={{ duration: 1, delay: 0.5 }}
      />
      <motion.circle
        cx="150"
        cy="60"
        r="5"
        fill={colors.accent}
        initial={animate ? { opacity: 0, y: 20 } : {}}
        animate={animate ? { opacity: [0, 1, 0], y: [20, -15, -35] } : {}}
        transition={{ duration: 1, delay: 0.6 }}
      />
      <motion.circle
        cx="60"
        cy="150"
        r="4"
        fill={colors.tertiary}
        initial={animate ? { opacity: 0, y: 20 } : {}}
        animate={animate ? { opacity: [0, 1, 0], y: [20, -10, -30] } : {}}
        transition={{ duration: 1, delay: 0.7 }}
      />
      <motion.circle
        cx="145"
        cy="140"
        r="5"
        fill={colors.primary}
        initial={animate ? { opacity: 0, y: 20 } : {}}
        animate={animate ? { opacity: [0, 1, 0], y: [20, -12, -32] } : {}}
        transition={{ duration: 1, delay: 0.8 }}
      />

      <defs>
        <filter id="shadow5" x="40" y="45" width="120" height="120" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="10" floodColor={colors.shadow} floodOpacity="0.4" />
        </filter>
      </defs>
    </svg>
  );
};

/**
 * ErrorIllustration - For error states
 * X mark with warning
 */
export const ErrorIllustration: React.FC<IllustrationProps> = ({
  size = "md",
  animate = true,
  className = "",
  ...props
}) => {
  const s = getSize(size);

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Background */}
      <circle cx="100" cy="100" r="80" fill="#FEF2F2" />

      {/* Main circle */}
      <motion.circle
        cx="100"
        cy="100"
        r="50"
        fill={colors.accent}
        filter="url(#shadow6)"
        initial={animate ? { scale: 0 } : {}}
        animate={animate ? { scale: 1 } : {}}
        transition={{ duration: 0.4, type: "spring" }}
      />

      {/* X mark */}
      <motion.g
        initial={animate ? { scale: 0, rotate: -90 } : {}}
        animate={animate ? { scale: 1, rotate: 0 } : {}}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={{ transformOrigin: "100px 100px" }}
      >
        <line x1="80" y1="80" x2="120" y2="120" stroke={colors.white} strokeWidth="8" strokeLinecap="round" />
        <line x1="120" y1="80" x2="80" y2="120" stroke={colors.white} strokeWidth="8" strokeLinecap="round" />
      </motion.g>

      {/* Warning triangles */}
      <motion.path
        d="M45 65L50 55L55 65H45Z"
        fill={colors.accent}
        initial={animate ? { opacity: 0 } : {}}
        animate={animate ? { opacity: [0, 1, 0.5, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      />
      <motion.path
        d="M145 135L150 125L155 135H145Z"
        fill={colors.accent}
        initial={animate ? { opacity: 0 } : {}}
        animate={animate ? { opacity: [0, 1, 0.5, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
      />

      <defs>
        <filter id="shadow6" x="40" y="45" width="120" height="120" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="10" floodColor="rgba(241, 52, 82, 0.3)" floodOpacity="0.4" />
        </filter>
      </defs>
    </svg>
  );
};

/**
 * LoadingIllustration - For loading states
 * Animated spinner with brand colors
 */
export const LoadingIllustration: React.FC<IllustrationProps> = ({
  size = "md",
  animate = true,
  className = "",
  ...props
}) => {
  const s = getSize(size);

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Background */}
      <circle cx="100" cy="100" r="80" fill={colors.light} />

      {/* Spinner track */}
      <circle cx="100" cy="100" r="40" stroke={colors.tertiary} strokeWidth="8" fill="none" />

      {/* Spinner */}
      <motion.circle
        cx="100"
        cy="100"
        r="40"
        stroke={colors.primary}
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="80 200"
        initial={animate ? { rotate: 0 } : {}}
        animate={animate ? { rotate: 360 } : {}}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "100px 100px" }}
      />

      {/* Center dot */}
      <motion.circle
        cx="100"
        cy="100"
        r="15"
        fill={colors.white}
        initial={animate ? { scale: 0.9 } : {}}
        animate={animate ? { scale: [0.9, 1.1, 0.9] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      />
      <motion.circle
        cx="100"
        cy="100"
        r="8"
        fill={colors.secondary}
        initial={animate ? { scale: 0.9 } : {}}
        animate={animate ? { scale: [0.9, 1.1, 0.9] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      />
    </svg>
  );
};

// Export all illustrations
export const PostyIllustrations = {
  EmptyStateIllustration,
  GenerateIllustration,
  ScheduleIllustration,
  AnalyticsIllustration,
  SuccessIllustration,
  ErrorIllustration,
  LoadingIllustration,
};

export default PostyIllustrations;
