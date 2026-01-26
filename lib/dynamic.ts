import dynamic from "next/dynamic";
import { ComponentType } from "react";

// Loading fallbacks - return null for minimal overhead
// Modals and sections handle their own animations
const ModalFallback = () => null;
const SectionFallback = () => null;

// ============== DYNAMIC MODAL IMPORTS ==============
// Modals are loaded only when opened, reducing initial bundle size

export const DynamicDeleteAccountModal = dynamic(
  () => import("@/components/ui/DeleteAccountModal").then((mod) => mod.default),
  { loading: ModalFallback, ssr: false }
);

export const DynamicUpgradeProModal = dynamic(
  () => import("@/components/ui/UpgradeProModal").then((mod) => mod.default),
  { loading: ModalFallback, ssr: false }
);

export const DynamicConsentModal = dynamic(
  () => import("@/components/ui/ConsentModal").then((mod) => mod.default),
  { loading: ModalFallback, ssr: false }
);

export const DynamicPublishToLinkedInModal = dynamic(
  () => import("@/components/linkedin/PublishToLinkedInModal").then((mod) => mod.default),
  { loading: ModalFallback, ssr: false }
);

export const DynamicLinkedInDisconnectModal = dynamic(
  () => import("@/components/linkedin/LinkedInDisconnectModal").then((mod) => mod.default),
  { loading: ModalFallback, ssr: false }
);

export const DynamicChatHistoryModal = dynamic(
  () => import("@/components/layout/ChatHistoryModal").then((mod) => mod.default),
  { loading: ModalFallback, ssr: false }
);

export const DynamicRenameConversationModal = dynamic(
  () => import("@/components/conversation/RenameConversationModal").then((mod) => mod.default),
  { loading: ModalFallback, ssr: false }
);

export const DynamicDeleteConfirmModal = dynamic(
  () => import("@/components/conversation/DeleteConfirmModal").then((mod) => mod.default),
  { loading: ModalFallback, ssr: false }
);

export const DynamicUpgradeModal = dynamic(
  () => import("@/components/subscription/UpgradeModal").then((mod) => mod.default),
  { loading: ModalFallback, ssr: false }
);

export const DynamicBottomSheet = dynamic(
  () => import("@/components/ui/BottomSheet").then((mod) => mod.default),
  { loading: ModalFallback, ssr: false }
);

// ============== DYNAMIC FEATURE IMPORTS ==============
// Heavy features loaded on demand

export const DynamicHistoryDetailPanel = dynamic(
  () => import("@/components/history/HistoryDetailPanel").then((mod) => mod.default),
  { loading: SectionFallback, ssr: false }
);

export const DynamicFilterPanel = dynamic(
  () => import("@/components/history/FilterPanel").then((mod) => mod.default),
  { loading: SectionFallback, ssr: false }
);

// ============== DYNAMIC STRIPE IMPORTS ==============
// Stripe components are heavy - load only on pricing page

export const DynamicPricingCard = dynamic(
  () => import("@/components/stripe/PricingCard").then((mod) => mod.default),
  { loading: SectionFallback, ssr: false }
);

// ============== DYNAMIC PROFILE IMPORTS ==============
// Profile components loaded when visiting profile page

export const DynamicProfileEditForm = dynamic(
  () => import("@/components/profile/ProfileEditForm").then((mod) => mod.default),
  { loading: SectionFallback, ssr: false }
);

export const DynamicProfileLinkedInCard = dynamic(
  () => import("@/components/profile/ProfileLinkedInCard").then((mod) => mod.default),
  { loading: SectionFallback, ssr: false }
);

// ============== HELPER TYPE ==============
// Type helper for dynamic components
export type DynamicComponent<P = object> = ComponentType<P>;
