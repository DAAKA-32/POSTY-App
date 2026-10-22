import type { Rate } from "@/lib/analytics/report";

const nf = new Intl.NumberFormat("fr-FR");

export const fmtInt = (n: number) => nf.format(Math.round(n));

export function fmtRate(r: Rate): string {
  return r.value === null ? "—" : `${r.value.toFixed(r.value >= 10 ? 1 : 2).replace(".", ",")} %`;
}

export function rateTitle(r: Rate): string {
  return r.value === null
    ? "Non calculable : dénominateur égal à zéro"
    : `${fmtInt(r.num)} / ${fmtInt(r.den)}`;
}

/** Minor units → "19,00 €"; several currencies are joined with " + ". */
export function fmtMoney(byCurrency: Record<string, number>): string {
  const parts = Object.entries(byCurrency)
    .filter(([, v]) => v !== 0)
    .map(([cur, cents]) => {
      try {
        return new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: cur.toUpperCase(),
        }).format(cents / 100);
      } catch {
        return `${(cents / 100).toFixed(2)} ${cur.toUpperCase()}`;
      }
    });
  return parts.length ? parts.join(" + ") : "0 €";
}

export function fmtDay(day: string): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", timeZone: "UTC" });
}

export function fmtTime(ms: number): string {
  return new Date(ms).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function fmtAgo(ms: number | null): string {
  if (!ms) return "—";
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

export const EVENT_LABELS: Record<string, string> = {
  page_view: "Page vue",
  pricing_page_view: "Page tarifs vue",
  feature_page_view: "Page fonctionnalité vue",
  faq_interaction: "FAQ ouverte",
  cta_click: "Clic CTA",
  plan_view: "Plan affiché",
  plan_click: "Plan cliqué",
  signup_started: "Inscription démarrée",
  signup_completed: "Inscription terminée",
  login_completed: "Connexion",
  onboarding_started: "Onboarding démarré",
  onboarding_completed: "Onboarding terminé",
  business_profile_completed: "Profil business complété",
  strategy_plan_approved: "Plan Strategist approuvé",
  first_content_created: "Premier contenu créé",
  first_post_published: "Premier post publié",
  post_created: "Post créé",
  post_scheduled: "Post programmé",
  post_published: "Post publié",
  post_publish_failed: "Échec de publication",
  marketing_strategy_created: "Stratégie créée",
  trial_started: "Essai démarré",
  checkout_started: "Paiement démarré",
  subscription_created: "Abonnement confirmé",
  subscription_renewed: "Renouvellement",
  subscription_cancelled: "Abonnement résilié",
  payment_failed: "Paiement échoué",
};

export const STAGE_LABELS: Record<string, string> = {
  visitors: "Nouveaux visiteurs",
  pricing_view: "Ont vu les tarifs",
  plan_click: "Ont cliqué un plan",
  signup_started: "Inscription démarrée",
  signup_completed: "Inscription terminée",
  activated: "Activés (1er contenu)",
  checkout_started: "Paiement démarré",
  paid: "Clients payants",
};
