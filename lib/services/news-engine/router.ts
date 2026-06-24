/**
 * Topic → domain → weighted provider list.
 *
 * Reuses the shared keyword SSoT (keywords.ts) so the router and the cheap
 * time-sensitivity gate can never drift. A topic can match several domains; we
 * union their provider lists keeping the max weight per provider.
 */

import type { Domain } from "./types";
import { detectDomains } from "./keywords";
import type { ProviderId } from "./providers";

export interface RoutedProvider {
  id: ProviderId;
  /** 0..1 — how strongly this provider fits the domain (modulates the score). */
  weight: number;
}

export function detectTopicDomain(topic: string): Domain[] {
  const d = detectDomains(topic);
  return d.length ? d : ["GENERAL"];
}

const ROUTING: Record<Domain, RoutedProvider[]> = {
  TECH_AI: [
    { id: "hackernews", weight: 1.0 },
    { id: "gdelt", weight: 0.8 },
    { id: "rss", weight: 0.7 },
    { id: "arxiv", weight: 0.4 },
  ],
  BUSINESS_SAAS: [
    { id: "hackernews", weight: 1.0 },
    { id: "gdelt", weight: 0.9 },
    { id: "rss", weight: 0.7 },
  ],
  FINANCE_MARKETS: [
    { id: "gdelt", weight: 1.0 },
    { id: "rss", weight: 0.6 },
  ],
  CRYPTO: [
    { id: "gdelt", weight: 1.0 },
    { id: "hackernews", weight: 0.6 },
    { id: "rss", weight: 0.5 },
  ],
  REGULATION: [
    { id: "gdelt", weight: 1.0 },
    { id: "rss", weight: 0.7 },
  ],
  GENERAL: [
    { id: "gdelt", weight: 1.0 },
    { id: "rss", weight: 0.4 },
  ],
  // EVERGREEN is the orchestrator's explicit last-resort fallback, not a route.
  EVERGREEN: [{ id: "wikimedia", weight: 1.0 }],
};

export function routeProviders(domains: Domain[]): RoutedProvider[] {
  const maxWeight = new Map<ProviderId, number>();
  for (const d of domains) {
    for (const rp of ROUTING[d] ?? ROUTING.GENERAL) {
      maxWeight.set(rp.id, Math.max(maxWeight.get(rp.id) ?? 0, rp.weight));
    }
  }
  return [...maxWeight.entries()]
    .map(([id, weight]) => ({ id, weight }))
    .sort((a, b) => b.weight - a.weight);
}
