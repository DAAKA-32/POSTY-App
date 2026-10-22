import AnalyticsDashboard from "@/components/admin/analytics/AnalyticsDashboard";

/**
 * /admin/analytics — private acquisition & conversion dashboard.
 *
 * This page ships no data. Every number comes from /api/admin/analytics/*,
 * which verify the Firebase ID token server-side and the admin allowlist
 * (lib/admin.ts). If the API answers 404 the client renders the standard
 * Next.js not-found page, so the route's existence is not revealed.
 * The layout (../layout.tsx) marks it noindex.
 */
export default function AdminAnalyticsPage() {
  return <AnalyticsDashboard />;
}
