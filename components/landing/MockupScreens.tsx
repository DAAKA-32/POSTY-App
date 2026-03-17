/**
 * MockupScreens — Real product screenshots for the landing page
 * "Aperçu produit" carousel.
 *
 * 5 screens: App, Chat, History, Schedule, Dashboard
 * Each slide renders a real screenshot from /public/.
 */

export interface MockupScreen {
  id: string;
  src: string;
  alt: string;
  label: string;
}

/** Build translated MockupScreen array from translation object */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMockupScreens(landing: any): MockupScreen[] {
  return [
    { id: "chat-welcome", src: "/images/screenshots/app.png", alt: landing.mockupChatAlt, label: landing.mockupChatLabel },
    { id: "conversation", src: "/images/screenshots/chat.png", alt: landing.mockupConversationAlt, label: landing.mockupConversationLabel },
    { id: "history", src: "/images/screenshots/history.png", alt: landing.mockupHistoryAlt, label: landing.mockupHistoryLabel },
    { id: "schedule", src: "/images/screenshots/schedule.png", alt: landing.mockupScheduleAlt, label: landing.mockupScheduleLabel },
    { id: "analytics", src: "/images/screenshots/dashboard.png", alt: landing.mockupAnalyticsAlt, label: landing.mockupAnalyticsLabel },
  ];
}

/** @deprecated Use getMockupScreens(t.landing) instead for i18n support */
export const MOCKUP_SCREENS: MockupScreen[] = [
  { id: "chat-welcome", src: "/images/screenshots/app.png", alt: "Vue principale de l'application Posty", label: "Chat" },
  { id: "conversation", src: "/images/screenshots/chat.png", alt: "Conversation avec l'IA Posty", label: "Conversation" },
  { id: "history", src: "/images/screenshots/history.png", alt: "Historique des posts générés", label: "Historique" },
  { id: "schedule", src: "/images/screenshots/schedule.png", alt: "Programmation des posts LinkedIn", label: "Programmes" },
  { id: "analytics", src: "/images/screenshots/dashboard.png", alt: "Tableau de bord et analytics", label: "Analytics" },
];
