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

export const MOCKUP_SCREENS: MockupScreen[] = [
  { id: "chat-welcome", src: "/app.png", alt: "Vue principale de l'application Posty", label: "Chat" },
  { id: "conversation", src: "/chat.png", alt: "Conversation avec l'IA Posty", label: "Conversation" },
  { id: "history", src: "/history.png", alt: "Historique des posts générés", label: "Historique" },
  { id: "schedule", src: "/schedule.png", alt: "Programmation des posts LinkedIn", label: "Programmes" },
  { id: "analytics", src: "/dashboard.png", alt: "Tableau de bord et analytics", label: "Analytics" },
];
