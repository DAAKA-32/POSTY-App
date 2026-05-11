import type { DetectedAIAction, AIActionType, AIActionParams } from "@/types";

// ── Day name → JS day index (0 = Sunday) ──
const DAY_NAMES: Record<string, number> = {
  lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 0,
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0,
};

const FR_DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const FR_MONTHS = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sep", "oct", "nov", "déc"];

function nextWeekday(targetDay: number): Date {
  const now = new Date();
  let delta = (targetDay - now.getDay() + 7) % 7;
  if (delta === 0) delta = 7; // Same weekday → next week
  const d = new Date(now);
  d.setDate(now.getDate() + delta);
  return d;
}

function parseTime(text: string): { hour: number; minute: number } | null {
  // Matches: "18h", "18h30", "18:30", "9h", "6pm", "6h du soir", "9h00"
  const m = text.match(/\b(\d{1,2})(?:h(\d{0,2})?|:(\d{2}))?\s*(?:(pm|am|du\s+soir|du\s+matin))?\b/i);
  if (!m) return null;

  let hour = parseInt(m[1], 10);
  const minute =
    m[2] != null ? parseInt(m[2] || "0", 10) :
    m[3] != null ? parseInt(m[3], 10) : 0;
  const suffix = (m[4] || "").toLowerCase();

  if ((suffix.includes("pm") || suffix.includes("soir")) && hour < 12) hour += 12;
  if (suffix.includes("am") && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return null;

  return { hour, minute: isNaN(minute) ? 0 : minute };
}

function parseDate(text: string): Date | null {
  const lower = text.toLowerCase();
  let base: Date | null = null;

  for (const [name, idx] of Object.entries(DAY_NAMES)) {
    if (lower.includes(name)) {
      base = nextWeekday(idx);
      break;
    }
  }

  if (!base) {
    if (/demain|tomorrow/.test(lower)) {
      base = new Date();
      base.setDate(base.getDate() + 1);
    } else if (/après-demain|day after tomorrow/.test(lower)) {
      base = new Date();
      base.setDate(base.getDate() + 2);
    } else if (/aujourd'hui|today/.test(lower)) {
      base = new Date();
    }
  }

  if (!base) return null;

  const time = parseTime(text);
  if (time) {
    base.setHours(time.hour, time.minute, 0, 0);
  } else {
    base.setHours(9, 0, 0, 0);
  }

  return base;
}

export function formatActionDate(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${FR_DAYS[date.getDay()]} ${date.getDate()} ${FR_MONTHS[date.getMonth()]} · ${h}h${m}`;
}

export interface DetectionContext {
  hasCurrentPost: boolean;
  postContent?: string;
  postId?: string;
}

// Actions that should be intercepted and not sent to /api/generate
const SCHEDULE_KW = [
  "programme", "planifie", "schedule",
  "programmer pour", "planifier pour",
  "publier le", "poster le",
  "programme ce post", "planifie ce post",
  "programme pour", "planifie pour",
];

const PUBLISH_NOW_KW = [
  "publie maintenant", "publie ce post maintenant",
  "publish now", "publie-le maintenant",
  "envoie maintenant", "poste maintenant",
  "publie sur linkedin", "publish to linkedin",
];

const DELETE_KW = [
  "supprime cette conversation",
  "efface cette conversation",
  "supprimer cette conversation",
  "effacer cette conversation",
  "delete this conversation",
  "supprime ce post",
  "efface ce post",
  "supprimer ce post",
];

export function detectIntent(
  message: string,
  ctx: DetectionContext
): DetectedAIAction | null {
  const lower = message.toLowerCase().trim();

  // ── SCHEDULE POST ──
  const hasScheduleKw = SCHEDULE_KW.some((k) => lower.includes(k));
  if (hasScheduleKw && ctx.hasCurrentPost) {
    const date = parseDate(message);
    if (date) {
      const tz =
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "Europe/Paris";

      const params: AIActionParams = {
        content: ctx.postContent,
        postId: ctx.postId,
        scheduledAt: date.toISOString(),
        platform: "linkedin",
        timezone: tz,
      };

      return {
        type: "schedule_post" as AIActionType,
        confidence: "high",
        params,
        displayLabel: "Programmer ce post",
        displayDetails: `LinkedIn · ${formatActionDate(date)}`,
        userMessage: message,
      };
    }
  }

  // ── PUBLISH NOW ──
  if (PUBLISH_NOW_KW.some((k) => lower.includes(k)) && ctx.hasCurrentPost) {
    const params: AIActionParams = {
      content: ctx.postContent,
      postId: ctx.postId,
      platform: "linkedin",
    };

    return {
      type: "publish_post" as AIActionType,
      confidence: "high",
      params,
      displayLabel: "Publier maintenant",
      displayDetails: "LinkedIn · Publication immédiate",
      userMessage: message,
    };
  }

  // ── DELETE CONVERSATION ──
  if (DELETE_KW.some((k) => lower.includes(k)) && ctx.postId) {
    const params: AIActionParams = { postId: ctx.postId };

    return {
      type: "delete_conversation" as AIActionType,
      confidence: "high",
      params,
      displayLabel: "Supprimer cette conversation",
      displayDetails: "Action irréversible",
      userMessage: message,
    };
  }

  return null;
}
