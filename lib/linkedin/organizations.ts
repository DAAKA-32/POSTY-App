/**
 * LinkedIn Company Page helpers (server-side).
 *
 * Fetches the list of organizations (Company Pages) that the connected user
 * administers. These are the only LinkedIn entities for which engagement
 * metrics can be retrieved via the API (Marketing Developer Platform).
 *
 * Requires the app to have the "Marketing Developer Platform" or
 * "Community Management API" product enabled, and the user to have granted
 * the `rw_organization_admin` + `r_organization_social` scopes at OAuth.
 *
 * If those scopes are missing (older connections, or MDP not yet approved),
 * `fetchAdminOrganizations` returns an empty array instead of throwing, so
 * callers can fall back to personal-profile-only mode cleanly.
 */

import type { LinkedInOrganizationAdmin } from "@/lib/db/firestore-admin";
import { LINKEDIN_ORG_SCOPES } from "@/lib/platforms/linkedin";

const LINKEDIN_API = "https://api.linkedin.com";

type RoleAssignmentResponse = {
  elements?: Array<{
    role?: string;
    state?: string;
    organization?: string; // "urn:li:organization:12345"
    "organization~"?: {
      id?: number | string;
      localizedName?: string;
      vanityName?: string;
      logoV2?: {
        original?: string;
      };
    };
  }>;
};

type OrganizationDetailsResponse = {
  id?: number | string;
  localizedName?: string;
  vanityName?: string;
  logoV2?: {
    original?: string;
  };
};

/**
 * Main entry point — returns the organizations the user administers, or [].
 * Never throws on missing scopes / 403 responses: those are expected when
 * MDP isn't enabled on the LinkedIn app.
 */
export async function fetchAdminOrganizations(
  accessToken: string,
  grantedScopes: string[]
): Promise<LinkedInOrganizationAdmin[]> {
  const hasAllOrgScopes = LINKEDIN_ORG_SCOPES.every((s) => grantedScopes.includes(s));
  if (!hasAllOrgScopes) {
    return [];
  }

  // /v2/organizationAcls?q=roleAssignee → lists pages the current user admins.
  // We ask for ADMINISTRATOR state=APPROVED + embed org details via projection.
  const url = new URL(`${LINKEDIN_API}/v2/organizationAcls`);
  url.searchParams.set("q", "roleAssignee");
  url.searchParams.set("role", "ADMINISTRATOR");
  url.searchParams.set("state", "APPROVED");
  url.searchParams.set(
    "projection",
    "(elements*(role,state,organization~(id,localizedName,vanityName,logoV2)))"
  );

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": "202405",
    },
  });

  if (!response.ok) {
    // 403 = product not enabled on the app, or scope not granted despite what
    // we asked for. Treat as "no organizations available", don't surface.
    if (response.status === 403 || response.status === 401) {
      return [];
    }
    const text = await response.text().catch(() => "");
    throw new Error(`organizationAcls ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as RoleAssignmentResponse;
  const elements = data.elements || [];

  const orgs: LinkedInOrganizationAdmin[] = [];
  for (const el of elements) {
    const embedded = el["organization~"];
    const urn = el.organization;
    if (!urn) continue;

    const id = String(embedded?.id ?? extractOrgId(urn));
    let name = embedded?.localizedName || "";
    let vanityName = embedded?.vanityName;
    let logoUrl = extractLogoUrl(embedded?.logoV2);

    // If projection didn't embed the details (rare, depending on API version),
    // do a follow-up fetch — non-blocking failure.
    if (!name) {
      try {
        const details = await fetchOrganizationDetails(accessToken, id);
        name = details?.localizedName || `Organization ${id}`;
        vanityName = vanityName || details?.vanityName;
        logoUrl = logoUrl || extractLogoUrl(details?.logoV2);
      } catch {
        name = `Organization ${id}`;
      }
    }

    orgs.push({
      urn,
      organizationId: id,
      name,
      vanityName: vanityName || undefined,
      logoUrl: logoUrl || undefined,
      role: el.role || "ADMINISTRATOR",
    });
  }

  // De-duplicate by urn (user can be in multiple roles on the same page)
  const seen = new Set<string>();
  return orgs.filter((o) => {
    if (seen.has(o.urn)) return false;
    seen.add(o.urn);
    return true;
  });
}

async function fetchOrganizationDetails(
  accessToken: string,
  organizationId: string
): Promise<OrganizationDetailsResponse | null> {
  const response = await fetch(`${LINKEDIN_API}/v2/organizations/${organizationId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });
  if (!response.ok) return null;
  return (await response.json()) as OrganizationDetailsResponse;
}

function extractOrgId(urn: string): string {
  const parts = urn.split(":");
  return parts[parts.length - 1] || "";
}

function extractLogoUrl(logoV2: OrganizationDetailsResponse["logoV2"]): string | undefined {
  if (!logoV2?.original) return undefined;
  // logoV2.original is itself a URN like "urn:li:digitalmediaAsset:…".
  // Resolving it to a URL requires an extra call; for now skip unless
  // LinkedIn already returned an absolute URL (rare via projection).
  if (logoV2.original.startsWith("http")) return logoV2.original;
  return undefined;
}
