/**
 * PLATFORMS — the canonical list of supported social networks with their
 * display config (name, icon, brand colors, minimum plan).
 *
 * Kept in its own module so consumers (PlatformSelector, ScheduleModal,
 * PublishToLinkedInModal, …) can import the table without dragging a React
 * component along — and so PlatformSelector.tsx exports only its component,
 * which keeps Fast Refresh able to hot-update edits to the selector.
 */

import { Platform } from "@/types";
import { LinkedInIcon } from "@/components/linkedin/LinkedInConnectButton";
import { PlanType } from "@/lib/config/plans";
import {
  ThreadsIcon,
  FacebookIcon,
  BlueskyIcon,
  MastodonIcon,
  DiscordIcon,
} from "./platform-icons";

export interface PlatformOption {
  id: Platform;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  minPlan: PlanType;
}

export const PLATFORMS: PlatformOption[] = [
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: <LinkedInIcon className="w-5 h-5" />,
    color: "text-[#0A66C2]",
    bgColor: "bg-[#0A66C2]/20",
    borderColor: "border-[#0A66C2]",
    minPlan: "pro",
  },
  {
    id: "threads",
    name: "Threads",
    icon: <ThreadsIcon className="w-5 h-5" />,
    color: "text-[#000000] dark:text-white",
    bgColor: "bg-black/10 dark:bg-white/20",
    borderColor: "border-black dark:border-white",
    minPlan: "max",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: <FacebookIcon className="w-5 h-5" />,
    color: "text-[#1877F2]",
    bgColor: "bg-[#1877F2]/20",
    borderColor: "border-[#1877F2]",
    minPlan: "max",
  },
  {
    id: "bluesky",
    name: "Bluesky",
    icon: <BlueskyIcon className="w-5 h-5" />,
    color: "text-[#0085FF]",
    bgColor: "bg-[#0085FF]/20",
    borderColor: "border-[#0085FF]",
    minPlan: "free",
  },
  {
    id: "mastodon",
    name: "Mastodon",
    icon: <MastodonIcon className="w-5 h-5" />,
    color: "text-[#6364FF]",
    bgColor: "bg-[#6364FF]/20",
    borderColor: "border-[#6364FF]",
    minPlan: "free",
  },
  {
    id: "discord",
    name: "Discord",
    icon: <DiscordIcon className="w-5 h-5" />,
    color: "text-[#5865F2]",
    bgColor: "bg-[#5865F2]/20",
    borderColor: "border-[#5865F2]",
    minPlan: "free",
  },
];
