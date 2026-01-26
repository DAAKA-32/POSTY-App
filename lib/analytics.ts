/**
 * Analytics utilities for tracking key metrics
 *
 * Key metrics tracked:
 * - Activation rate (% who generate 1 post)
 * - Time to first value
 * - Feature usage
 */

// Storage keys for analytics
const ANALYTICS_KEYS = {
  FIRST_POST_TIME: "posty_first_post_time",
  SIGNUP_TIME: "posty_signup_time",
  POST_COUNT: "posty_post_count",
  FEATURE_USAGE: "posty_feature_usage",
  ACTIVATION_STATUS: "posty_activated",
};

export interface AnalyticsData {
  signupTime: number | null;
  firstPostTime: number | null;
  postCount: number;
  isActivated: boolean;
  timeToFirstValue: number | null; // in seconds
  featureUsage: Record<string, number>;
}

/**
 * Initialize analytics for a new user
 */
export function initAnalytics(): void {
  if (typeof window === "undefined") return;

  const signupTime = localStorage.getItem(ANALYTICS_KEYS.SIGNUP_TIME);
  if (!signupTime) {
    localStorage.setItem(ANALYTICS_KEYS.SIGNUP_TIME, Date.now().toString());
    localStorage.setItem(ANALYTICS_KEYS.POST_COUNT, "0");
    localStorage.setItem(ANALYTICS_KEYS.FEATURE_USAGE, JSON.stringify({}));
    localStorage.setItem(ANALYTICS_KEYS.ACTIVATION_STATUS, "false");
  }
}

/**
 * Track when a user generates their first post (activation event)
 */
export function trackFirstPost(): void {
  if (typeof window === "undefined") return;

  const firstPostTime = localStorage.getItem(ANALYTICS_KEYS.FIRST_POST_TIME);
  if (firstPostTime) return; // Already activated

  const now = Date.now();
  localStorage.setItem(ANALYTICS_KEYS.FIRST_POST_TIME, now.toString());
  localStorage.setItem(ANALYTICS_KEYS.ACTIVATION_STATUS, "true");

  // Increment post count
  incrementPostCount();

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    const signupTime = localStorage.getItem(ANALYTICS_KEYS.SIGNUP_TIME);
    const timeToActivation = signupTime
      ? Math.round((now - parseInt(signupTime)) / 1000)
      : null;
    console.log(`[Analytics] User activated! Time to first post: ${timeToActivation}s`);
  }
}

/**
 * Track post generation
 */
export function trackPostGeneration(): void {
  if (typeof window === "undefined") return;

  const isFirstPost = !localStorage.getItem(ANALYTICS_KEYS.FIRST_POST_TIME);
  if (isFirstPost) {
    trackFirstPost();
  } else {
    incrementPostCount();
  }
}

/**
 * Increment the post count
 */
function incrementPostCount(): void {
  const currentCount = parseInt(
    localStorage.getItem(ANALYTICS_KEYS.POST_COUNT) || "0"
  );
  localStorage.setItem(ANALYTICS_KEYS.POST_COUNT, (currentCount + 1).toString());
}

/**
 * Track feature usage
 */
export function trackFeatureUsage(featureName: string): void {
  if (typeof window === "undefined") return;

  try {
    const usage = JSON.parse(
      localStorage.getItem(ANALYTICS_KEYS.FEATURE_USAGE) || "{}"
    );
    usage[featureName] = (usage[featureName] || 0) + 1;
    localStorage.setItem(ANALYTICS_KEYS.FEATURE_USAGE, JSON.stringify(usage));
  } catch (e) {
    console.warn("Failed to track feature usage:", e);
  }
}

/**
 * Get all analytics data for the current user
 */
export function getAnalyticsData(): AnalyticsData {
  if (typeof window === "undefined") {
    return {
      signupTime: null,
      firstPostTime: null,
      postCount: 0,
      isActivated: false,
      timeToFirstValue: null,
      featureUsage: {},
    };
  }

  const signupTime = localStorage.getItem(ANALYTICS_KEYS.SIGNUP_TIME);
  const firstPostTime = localStorage.getItem(ANALYTICS_KEYS.FIRST_POST_TIME);
  const postCount = parseInt(
    localStorage.getItem(ANALYTICS_KEYS.POST_COUNT) || "0"
  );
  const isActivated =
    localStorage.getItem(ANALYTICS_KEYS.ACTIVATION_STATUS) === "true";

  let featureUsage: Record<string, number> = {};
  try {
    featureUsage = JSON.parse(
      localStorage.getItem(ANALYTICS_KEYS.FEATURE_USAGE) || "{}"
    );
  } catch (e) {
    // Ignore parse errors
  }

  // Calculate time to first value
  let timeToFirstValue: number | null = null;
  if (signupTime && firstPostTime) {
    timeToFirstValue = Math.round(
      (parseInt(firstPostTime) - parseInt(signupTime)) / 1000
    );
  }

  return {
    signupTime: signupTime ? parseInt(signupTime) : null,
    firstPostTime: firstPostTime ? parseInt(firstPostTime) : null,
    postCount,
    isActivated,
    timeToFirstValue,
    featureUsage,
  };
}

/**
 * Check if user is activated (has generated at least 1 post)
 */
export function isUserActivated(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ANALYTICS_KEYS.ACTIVATION_STATUS) === "true";
}

/**
 * Get activation rate for display purposes
 * This returns a placeholder value - in production, this would come from backend analytics
 */
export function getActivationRateDisplay(): string {
  // In a real implementation, this would fetch from a backend analytics service
  // For now, return a reasonable placeholder based on industry standards
  const analyticsData = getAnalyticsData();

  if (analyticsData.isActivated) {
    // User is activated - show encouraging message
    return "Vous faites partie des utilisateurs actifs !";
  }

  // User not yet activated - encourage first post
  return "Générez votre premier post pour commencer !";
}

/**
 * Calculate and return time to first value in human-readable format
 */
export function getTimeToFirstValueDisplay(): string | null {
  const data = getAnalyticsData();
  if (!data.timeToFirstValue) return null;

  const seconds = data.timeToFirstValue;
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  return `${Math.round(seconds / 3600)}h`;
}

/**
 * Reset analytics (for testing or account deletion)
 */
export function resetAnalytics(): void {
  if (typeof window === "undefined") return;

  Object.values(ANALYTICS_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

/**
 * Export analytics data for debugging
 */
export function exportAnalyticsData(): string {
  const data = getAnalyticsData();
  return JSON.stringify(data, null, 2);
}
