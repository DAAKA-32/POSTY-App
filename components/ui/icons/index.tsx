/**
 * Posty Custom Icon System
 *
 * Consistent icon components for the Posty brand.
 * All icons follow the Posty style guidelines:
 * - Stroke width: 1.5px (standard) / 2px (emphasis)
 * - Rounded corners matching brand radius
 * - Optimized for 24x24 default size
 *
 * @example
 * import { PostyLogo, GenerateIcon, ScheduleIcon } from '@/components/ui/icons';
 *
 * <GenerateIcon className="w-6 h-6 text-primary" />
 * <ScheduleIcon size="lg" variant="filled" />
 */

import React from "react";

// Icon props interface
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  variant?: "outline" | "filled" | "duotone";
  strokeWidth?: number;
}

// Size mapping
const sizeMap = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
};

// Helper to get size
const getSize = (size: IconProps["size"]) => {
  if (typeof size === "number") return size;
  return sizeMap[size || "md"];
};

// Base icon wrapper
const IconWrapper = ({
  children,
  size = "md",
  className = "",
  strokeWidth = 1.5,
  ...props
}: IconProps & { children: React.ReactNode }) => {
  const s = getSize(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      strokeWidth={strokeWidth}
      {...props}
    >
      {children}
    </svg>
  );
};

/**
 * PostyLogo - Brand mark icon
 * The Posty logo as an icon component
 */
export const PostyLogo: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} />
    <path
      d="M8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12C16 14.2091 14.2091 16 12 16"
      stroke="currentColor"
      strokeWidth={props.strokeWidth || 1.5}
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </IconWrapper>
);

/**
 * GenerateIcon - AI content generation
 * Sparkles/magic wand effect for content creation
 */
export const GenerateIcon: React.FC<IconProps> = ({ variant = "outline", ...props }) => (
  <IconWrapper {...props}>
    {variant === "filled" ? (
      <>
        <path d="M12 2L13.5 8L19 6L15 10L21 12L15 14L19 18L13.5 16L12 22L10.5 16L5 18L9 14L3 12L9 10L5 6L10.5 8L12 2Z" fill="currentColor" />
      </>
    ) : (
      <>
        <path
          d="M12 3V7M12 17V21M21 12H17M7 12H3M18.364 5.636L15.536 8.464M8.464 15.536L5.636 18.364M18.364 18.364L15.536 15.536M8.464 8.464L5.636 5.636"
          stroke="currentColor"
          strokeWidth={props.strokeWidth || 1.5}
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} />
      </>
    )}
  </IconWrapper>
);

/**
 * ScheduleIcon - Post scheduling
 * Calendar with clock overlay
 */
export const ScheduleIcon: React.FC<IconProps> = ({ variant = "outline", ...props }) => (
  <IconWrapper {...props}>
    {variant === "filled" ? (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" fill="currentColor" />
        <path d="M3 9H21" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} />
        <path d="M8 3V6M16 3V6" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} strokeLinecap="round" />
        <circle cx="15" cy="15" r="5" fill="white" />
        <path d="M15 13V15L16.5 16.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </>
    ) : (
      <>
        <rect x="3" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} />
        <path d="M3 9H17" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} />
        <path d="M7 3V6M13 3V6" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} strokeLinecap="round" />
        <circle cx="17" cy="17" r="5" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} />
        <path d="M17 15V17L18.5 18.5" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} strokeLinecap="round" strokeLinejoin="round" />
      </>
    )}
  </IconWrapper>
);

/**
 * AnalyticsIcon - Statistics and insights
 * Bar chart with upward trend
 */
export const AnalyticsIcon: React.FC<IconProps> = ({ variant = "outline", ...props }) => (
  <IconWrapper {...props}>
    {variant === "filled" ? (
      <>
        <rect x="4" y="10" width="4" height="10" rx="1" fill="currentColor" />
        <rect x="10" y="6" width="4" height="14" rx="1" fill="currentColor" />
        <rect x="16" y="2" width="4" height="18" rx="1" fill="currentColor" />
      </>
    ) : (
      <>
        <rect x="4" y="10" width="4" height="10" rx="1" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} />
        <rect x="10" y="6" width="4" height="14" rx="1" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} />
        <rect x="16" y="2" width="4" height="18" rx="1" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} />
        <path d="M4 4L12 8L20 2" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      </>
    )}
  </IconWrapper>
);

/**
 * CoachIcon - AI coaching and insights
 * Brain/target combination for smart guidance
 */
export const CoachIcon: React.FC<IconProps> = ({ variant = "outline", ...props }) => (
  <IconWrapper {...props}>
    {variant === "filled" ? (
      <>
        <circle cx="12" cy="12" r="9" fill="currentColor" />
        <circle cx="12" cy="12" r="5" fill="white" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
        <path d="M12 3V6M12 18V21M3 12H6M18 12H21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      </>
    ) : (
      <>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} />
        <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <path d="M12 3V6M12 18V21M3 12H6M18 12H21" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} strokeLinecap="round" />
      </>
    )}
  </IconWrapper>
);

/**
 * LinkedInPostIcon - LinkedIn post representation
 * Stylized LinkedIn document
 */
export const LinkedInPostIcon: React.FC<IconProps> = ({ variant = "outline", ...props }) => (
  <IconWrapper {...props}>
    {variant === "filled" ? (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" fill="currentColor" />
        <path d="M8 8H16M8 12H16M8 16H13" stroke="white" strokeWidth={1.5} strokeLinecap="round" />
      </>
    ) : (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} />
        <path d="M8 8H16M8 12H16M8 16H13" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} strokeLinecap="round" />
      </>
    )}
  </IconWrapper>
);

/**
 * StyleIcon - Post style selection
 * Palette/brush for creative style
 */
export const StyleIcon: React.FC<IconProps> = ({ variant = "outline", ...props }) => (
  <IconWrapper {...props}>
    {variant === "filled" ? (
      <>
        <path
          d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C12.9 22 13.6 21.3 13.6 20.4C13.6 20 13.5 19.6 13.2 19.3C12.9 19 12.8 18.7 12.8 18.3C12.8 17.4 13.5 16.7 14.4 16.7H16C19.3 16.7 22 14 22 10.7C22 5.9 17.5 2 12 2Z"
          fill="currentColor"
        />
        <circle cx="6.5" cy="11.5" r="1.5" fill="white" />
        <circle cx="9.5" cy="7.5" r="1.5" fill="white" />
        <circle cx="14.5" cy="7.5" r="1.5" fill="white" />
        <circle cx="17.5" cy="11.5" r="1.5" fill="white" />
      </>
    ) : (
      <>
        <path
          d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C12.9 22 13.6 21.3 13.6 20.4C13.6 20 13.5 19.6 13.2 19.3C12.9 19 12.8 18.7 12.8 18.3C12.8 17.4 13.5 16.7 14.4 16.7H16C19.3 16.7 22 14 22 10.7C22 5.9 17.5 2 12 2Z"
          stroke="currentColor"
          strokeWidth={props.strokeWidth || 1.5}
        />
        <circle cx="6.5" cy="11.5" r="1.5" fill="currentColor" />
        <circle cx="9.5" cy="7.5" r="1.5" fill="currentColor" />
        <circle cx="14.5" cy="7.5" r="1.5" fill="currentColor" />
        <circle cx="17.5" cy="11.5" r="1.5" fill="currentColor" />
      </>
    )}
  </IconWrapper>
);

/**
 * HistoryIcon - Post history/timeline
 * Clock with circular arrow
 */
export const HistoryIcon: React.FC<IconProps> = ({ variant = "outline", ...props }) => (
  <IconWrapper {...props}>
    {variant === "filled" ? (
      <>
        <circle cx="12" cy="13" r="8" fill="currentColor" />
        <path d="M12 9V13L14.5 15.5" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4.5 4.5L3 7H6.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.5 12C3.5 7.30558 7.30558 3.5 12 3.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      </>
    ) : (
      <>
        <circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} />
        <path d="M12 9V13L14.5 15.5" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4.5 4.5L3 7H6.5" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.5 12C3.5 7.30558 7.30558 3.5 12 3.5" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} strokeLinecap="round" />
      </>
    )}
  </IconWrapper>
);

/**
 * ProfileIcon - User profile
 * Person with settings gear
 */
export const ProfileIcon: React.FC<IconProps> = ({ variant = "outline", ...props }) => (
  <IconWrapper {...props}>
    {variant === "filled" ? (
      <>
        <circle cx="10" cy="8" r="4" fill="currentColor" />
        <path d="M3 20C3 16.134 6.13401 13 10 13C11.5 13 12.9 13.4 14.1 14.1" fill="currentColor" />
        <path d="M3 20C3 16.134 6.13401 13 10 13C11.5 13 12.9 13.4 14.1 14.1" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        <circle cx="18" cy="17" r="3" stroke="currentColor" strokeWidth={1.5} />
        <circle cx="18" cy="17" r="1" fill="currentColor" />
      </>
    ) : (
      <>
        <circle cx="10" cy="8" r="4" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} />
        <path d="M3 20C3 16.134 6.13401 13 10 13C11.5 13 12.9 13.4 14.1 14.1" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} strokeLinecap="round" />
        <circle cx="18" cy="17" r="3" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} />
        <circle cx="18" cy="17" r="1" fill="currentColor" />
      </>
    )}
  </IconWrapper>
);

/**
 * SettingsIcon - App settings
 * Gear/cog icon
 */
export const SettingsIcon: React.FC<IconProps> = ({ variant = "outline", ...props }) => (
  <IconWrapper {...props}>
    {variant === "filled" ? (
      <>
        <path
          d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
          fill="white"
        />
        <path
          d="M19.4 15C19.2 15.3 19.2 15.7 19.3 16L20.3 17.8C20.5 18.2 20.4 18.7 20.1 19L18.7 20.4C18.4 20.7 17.9 20.8 17.5 20.6L15.7 19.6C15.4 19.5 15 19.5 14.7 19.7C14.4 19.9 14.1 20 13.7 20.1L13.5 22C13.4 22.4 13.1 22.8 12.6 22.8H10.6C10.2 22.8 9.8 22.5 9.7 22.1L9.5 20.1C9.4 19.7 9.2 19.4 8.9 19.2C8.6 19 8.2 19 7.9 19.1L6.1 20.1C5.7 20.3 5.2 20.2 4.9 19.9L3.5 18.5C3.2 18.2 3.1 17.7 3.3 17.3L4.3 15.5C4.4 15.2 4.4 14.8 4.2 14.5C4 14.2 3.9 13.9 3.8 13.5L2 13.3C1.6 13.2 1.2 12.9 1.2 12.4V10.4C1.2 10 1.5 9.6 1.9 9.5L3.9 9.3C4.3 9.2 4.6 9 4.8 8.7C5 8.4 5 8 4.9 7.7L3.9 5.9C3.7 5.5 3.8 5 4.1 4.7L5.5 3.3C5.8 3 6.3 2.9 6.7 3.1L8.5 4.1C8.8 4.2 9.2 4.2 9.5 4C9.8 3.8 10.1 3.7 10.5 3.6L10.7 1.8C10.8 1.4 11.1 1 11.6 1H13.6C14 1 14.4 1.3 14.5 1.7L14.7 3.7C14.8 4.1 15 4.4 15.3 4.6C15.6 4.8 16 4.8 16.3 4.7L18.1 3.7C18.5 3.5 19 3.6 19.3 3.9L20.7 5.3C21 5.6 21.1 6.1 20.9 6.5L19.9 8.3C19.8 8.6 19.8 9 20 9.3C20.2 9.6 20.3 9.9 20.4 10.3L22.2 10.5C22.6 10.6 23 10.9 23 11.4V13.4C23 13.8 22.7 14.2 22.3 14.3L20.3 14.5C19.9 14.6 19.6 14.8 19.4 15.1V15Z"
          fill="currentColor"
        />
      </>
    ) : (
      <>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} />
        <path
          d="M19.4 15C19.2 15.3 19.2 15.7 19.3 16L20.3 17.8C20.5 18.2 20.4 18.7 20.1 19L18.7 20.4C18.4 20.7 17.9 20.8 17.5 20.6L15.7 19.6C15.4 19.5 15 19.5 14.7 19.7C14.4 19.9 14.1 20 13.7 20.1L13.5 22C13.4 22.4 13.1 22.8 12.6 22.8H10.6C10.2 22.8 9.8 22.5 9.7 22.1L9.5 20.1C9.4 19.7 9.2 19.4 8.9 19.2C8.6 19 8.2 19 7.9 19.1L6.1 20.1C5.7 20.3 5.2 20.2 4.9 19.9L3.5 18.5C3.2 18.2 3.1 17.7 3.3 17.3L4.3 15.5C4.4 15.2 4.4 14.8 4.2 14.5C4 14.2 3.9 13.9 3.8 13.5L2 13.3C1.6 13.2 1.2 12.9 1.2 12.4V10.4C1.2 10 1.5 9.6 1.9 9.5L3.9 9.3C4.3 9.2 4.6 9 4.8 8.7C5 8.4 5 8 4.9 7.7L3.9 5.9C3.7 5.5 3.8 5 4.1 4.7L5.5 3.3C5.8 3 6.3 2.9 6.7 3.1L8.5 4.1C8.8 4.2 9.2 4.2 9.5 4C9.8 3.8 10.1 3.7 10.5 3.6L10.7 1.8C10.8 1.4 11.1 1 11.6 1H13.6C14 1 14.4 1.3 14.5 1.7L14.7 3.7C14.8 4.1 15 4.4 15.3 4.6C15.6 4.8 16 4.8 16.3 4.7L18.1 3.7C18.5 3.5 19 3.6 19.3 3.9L20.7 5.3C21 5.6 21.1 6.1 20.9 6.5L19.9 8.3C19.8 8.6 19.8 9 20 9.3C20.2 9.6 20.3 9.9 20.4 10.3L22.2 10.5C22.6 10.6 23 10.9 23 11.4V13.4C23 13.8 22.7 14.2 22.3 14.3L20.3 14.5C19.9 14.6 19.6 14.8 19.4 15.1V15Z"
          stroke="currentColor"
          strokeWidth={props.strokeWidth || 1.5}
        />
      </>
    )}
  </IconWrapper>
);

/**
 * StorytellingIcon - Storytelling post style
 * Book with heart/narrative symbol
 */
export const StorytellingIcon: React.FC<IconProps> = ({ variant = "outline", ...props }) => (
  <IconWrapper {...props}>
    {variant === "filled" ? (
      <>
        <path d="M4 19V5C4 3.89543 4.89543 3 6 3H18C19.1046 3 20 3.89543 20 5V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19Z" fill="currentColor" />
        <path d="M12 7C12 7 9 9.5 9 11.5C9 12.8807 10.1193 14 11.5 14C11.6712 14 11.8384 13.9829 12 13.9503C12.1616 13.9829 12.3288 14 12.5 14C13.8807 14 15 12.8807 15 11.5C15 9.5 12 7 12 7Z" fill="white" />
      </>
    ) : (
      <>
        <path d="M4 19V5C4 3.89543 4.89543 3 6 3H18C19.1046 3 20 3.89543 20 5V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19Z" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} />
        <path d="M4 7H20" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} />
        <path d="M12 11C12 11 9 13 9 14.5C9 15.8807 10.1193 17 11.5 17C11.6712 17 11.8384 16.9829 12 16.9503C12.1616 16.9829 12.3288 17 12.5 17C13.8807 17 15 15.8807 15 14.5C15 13 12 11 12 11Z" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} strokeLinejoin="round" />
      </>
    )}
  </IconWrapper>
);

/**
 * BusinessIcon - Business post style
 * Briefcase with chart
 */
export const BusinessIcon: React.FC<IconProps> = ({ variant = "outline", ...props }) => (
  <IconWrapper {...props}>
    {variant === "filled" ? (
      <>
        <rect x="2" y="7" width="20" height="14" rx="2" fill="currentColor" />
        <path d="M16 7V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V7" stroke="currentColor" strokeWidth={1.5} />
        <path d="M7 14L10 11L13 14L17 10" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </>
    ) : (
      <>
        <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} />
        <path d="M16 7V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V7" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} />
        <path d="M7 14L10 11L13 14L17 10" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} strokeLinecap="round" strokeLinejoin="round" />
      </>
    )}
  </IconWrapper>
);

/**
 * PremiumIcon - Premium/Pro features
 * Crown with sparkle
 */
export const PremiumIcon: React.FC<IconProps> = ({ variant = "outline", ...props }) => (
  <IconWrapper {...props}>
    {variant === "filled" ? (
      <>
        <path d="M3 17L5 8L9 12L12 5L15 12L19 8L21 17H3Z" fill="currentColor" />
        <path d="M3 17L5 8L9 12L12 5L15 12L19 8L21 17" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
        <rect x="3" y="17" width="18" height="3" rx="1" fill="currentColor" />
        <circle cx="19" cy="5" r="2" fill="currentColor" />
        <path d="M19 3V4M19 6V7M17 5H18M20 5H21" stroke="white" strokeWidth={0.5} strokeLinecap="round" />
      </>
    ) : (
      <>
        <path d="M3 17L5 8L9 12L12 5L15 12L19 8L21 17H3Z" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} strokeLinejoin="round" />
        <rect x="3" y="17" width="18" height="3" rx="1" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} />
        <circle cx="19" cy="5" r="2" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} />
        <path d="M19 3.5V4.5M17.5 5H18.5M19.5 5H20.5" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} strokeLinecap="round" />
      </>
    )}
  </IconWrapper>
);

/**
 * LinkedInIcon - LinkedIn brand icon
 * Stylized LinkedIn logo
 */
export const LinkedInIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <path
      d="M16 8C17.5913 8 19.1174 8.63214 20.2426 9.75736C21.3679 10.8826 22 12.4087 22 14V21H18V14C18 13.4696 17.7893 12.9609 17.4142 12.5858C17.0391 12.2107 16.5304 12 16 12C15.4696 12 14.9609 12.2107 14.5858 12.5858C14.2107 12.9609 14 13.4696 14 14V21H10V14C10 12.4087 10.6321 10.8826 11.7574 9.75736C12.8826 8.63214 14.4087 8 16 8Z"
      stroke="currentColor"
      strokeWidth={props.strokeWidth || 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect x="2" y="9" width="4" height="12" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="4" cy="4" r="2" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} strokeLinecap="round" strokeLinejoin="round" />
  </IconWrapper>
);

/**
 * VoiceIcon - Voice input/dictation
 * Microphone with waves
 */
export const VoiceIcon: React.FC<IconProps> = ({ variant = "outline", ...props }) => (
  <IconWrapper {...props}>
    {variant === "filled" ? (
      <>
        <rect x="9" y="2" width="6" height="11" rx="3" fill="currentColor" />
        <path d="M5 10V11C5 14.866 8.13401 18 12 18C15.866 18 19 14.866 19 11V10" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        <path d="M12 18V22M8 22H16" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        <path d="M3 10C3 10 2 10.5 2 12C2 13.5 3 14 3 14" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        <path d="M21 10C21 10 22 10.5 22 12C22 13.5 21 14 21 14" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      </>
    ) : (
      <>
        <rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} />
        <path d="M5 10V11C5 14.866 8.13401 18 12 18C15.866 18 19 14.866 19 11V10" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} strokeLinecap="round" />
        <path d="M12 18V22M8 22H16" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} strokeLinecap="round" />
        <path d="M3 10C3 10 2 10.5 2 12C2 13.5 3 14 3 14" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} strokeLinecap="round" />
        <path d="M21 10C21 10 22 10.5 22 12C22 13.5 21 14 21 14" stroke="currentColor" strokeWidth={props.strokeWidth || 1.5} strokeLinecap="round" />
      </>
    )}
  </IconWrapper>
);

// Export all icons as a collection
export const PostyIcons = {
  PostyLogo,
  GenerateIcon,
  ScheduleIcon,
  AnalyticsIcon,
  CoachIcon,
  LinkedInPostIcon,
  StyleIcon,
  HistoryIcon,
  ProfileIcon,
  SettingsIcon,
  StorytellingIcon,
  BusinessIcon,
  PremiumIcon,
  LinkedInIcon,
  VoiceIcon,
};

export default PostyIcons;
