import { ReactNode } from "react";
import { SidebarPostsProvider } from "@/contexts/SidebarPostsContext";
import { QuotaProvider } from "@/contexts/QuotaContext";
import { LinkedInProvider } from "@/contexts/LinkedInContext";
import { FacebookProvider } from "@/contexts/FacebookContext";
import { ThreadsProvider } from "@/contexts/ThreadsContext";
import { BlueskyProvider } from "@/contexts/BlueskyContext";
import { MastodonProvider } from "@/contexts/MastodonContext";
import { DiscordProvider } from "@/contexts/DiscordContext";
import { XProvider } from "@/contexts/XContext";
import { InstagramProvider } from "@/contexts/InstagramContext";
import { RedditProvider } from "@/contexts/RedditContext";
import { ThreadszProvider } from "@/contexts/ThreadszContext";
import { SchedulingProvider } from "@/contexts/SchedulingContext";
import PersistentMobileHeader from "@/components/layout/PersistentMobileHeader";
import { StrategistSessionProvider } from "@/components/strategist/StrategistSession";
import {
  AutonomousBatchBanner,
  GlobalCommandPalette,
} from "@/components/providers/DeferredLayoutWidgets";

/**
 * Authenticated route-group layout.
 *
 * PERF (C3/I7): the heavy, Firebase-backed providers — Quota, the 10 platform
 * connection providers, Scheduling, SidebarPosts — plus the app-only overlays
 * (mobile header, Strategist session, command palette) live HERE, not in the
 * root layout. Public pages (landing, login, signup, pricing, business, legal,
 * SEO) no longer mount this provider tree, so they no longer pay for its module
 * graph or its Firestore listeners on first load.
 *
 * The root layout still provides Theme / App(gestures) / Auth / Subscription /
 * Language / AIMode — needed by BOTH public and authenticated pages — so every
 * provider below has them in scope. This is a NESTED layout: URLs are unchanged
 * (route groups are URL-transparent) and provider instances persist across
 * navigation WITHIN the group (dashboard → profile does not remount them).
 *
 * The Strategist CONVERSATION (StrategistSessionProvider) is mounted here, around
 * the pages, so it survives Posty Post ⇄ Posty Stratège switches AND visits to
 * other pages (e.g. a plan's "view calendar" link). Only the workspace UI is
 * loaded on demand (app/(app)/app/strategist/page.tsx). AutonomousBatchBanner
 * stays inside LinkedInProvider; GlobalCommandPalette stays innermost.
 */
export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SidebarPostsProvider>
      <PersistentMobileHeader />
      <QuotaProvider>
        <LinkedInProvider>
          <FacebookProvider>
            <ThreadsProvider>
              <BlueskyProvider>
                <MastodonProvider>
                  <DiscordProvider>
                    <XProvider>
                      <InstagramProvider>
                        <RedditProvider>
                          <ThreadszProvider>
                            <SchedulingProvider>
                              <StrategistSessionProvider>
                                {children}
                                <GlobalCommandPalette />
                              </StrategistSessionProvider>
                            </SchedulingProvider>
                          </ThreadszProvider>
                        </RedditProvider>
                      </InstagramProvider>
                    </XProvider>
                  </DiscordProvider>
                </MastodonProvider>
              </BlueskyProvider>
            </ThreadsProvider>
          </FacebookProvider>
          <AutonomousBatchBanner />
        </LinkedInProvider>
      </QuotaProvider>
    </SidebarPostsProvider>
  );
}
