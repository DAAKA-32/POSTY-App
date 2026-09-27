// Regression test for the 2026-09 incident: every scheduled post failed with
// "Une erreur est survenue lors de la publication" because the Cloud
// Functions runtime had no TOKEN_ENCRYPTION_KEY while the app (Vercel)
// stored LinkedIn tokens encrypted with it. Kept in its own file: the token
// cipher caches its key per module instance.

import { randomBytes } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { beforeAll, describe, expect, it } from "vitest";
import { tokenKeyStatus } from "../../functions/src/crypto/token-cipher";
import { RETRY_DELAYS_MS } from "../../functions/src/scheduler/policy";
import { runSchedulerTick } from "../../functions/src/scheduler/run";
import { T0, USER, createHarness, linkedInConnection, scheduledPostDoc } from "./helpers/fakes";

const KEY = randomBytes(32).toString("base64");
const ACCESS_TOKEN = "AQX-token-after-reconnect";
let tokenStoredByTheApp = "";

beforeAll(async () => {
  // The app (Vercel) has the key and encrypts the token at reconnect time.
  process.env.TOKEN_ENCRYPTION_KEY = KEY;
  const appCipher = await import("@/lib/crypto/token-cipher");
  tokenStoredByTheApp = appCipher.encryptToken(ACCESS_TOKEN);
  // The Functions runtime was deployed from functions/.env.<projectId>
  // WITHOUT the key.
  delete process.env.TOKEN_ENCRYPTION_KEY;
});

describe("incident 2026-09 — scheduler deployed without TOKEN_ENCRYPTION_KEY", () => {
  it("is now reported explicitly, retried with backoff, and publishes once the key is deployed", async () => {
    const h = createHarness();
    h.data.setConnection("linkedinConnections", USER, linkedInConnection(tokenStoredByTheApp));
    h.store.docs.set("p1", scheduledPostDoc({ scheduledAt: Timestamp.fromMillis(T0) }));
    const health = () => ({ encryptionKeyStatus: tokenKeyStatus(), zernioKeyStatus: "ok" });

    // ── Broken deployment ────────────────────────────────────────────────
    await runSchedulerTick(h.deps("run-broken", { configHealth: health() }));

    const post = h.store.get("p1");
    expect(post.status).toBe("retrying"); // not "failed" after 3 blind 1-minute attempts
    expect(post.lastError).toMatchObject({
      code: "CONFIG_ENCRYPTION_KEY_MISSING",
      retryable: true,
      ambiguous: false,
      platform: "linkedin",
    });
    expect(String((post.lastError as { detail: string }).detail)).toContain("TOKEN_ENCRYPTION_KEY");
    expect(h.linkedin.ugcCreateCalls).toBe(0); // nothing half-sent
    // Loud, queryable signal on every tick + in the heartbeat.
    expect(h.log.events("scheduler.config_invalid")).toHaveLength(1);
    expect(h.store.heartbeats.at(-1)!.config.encryptionKeyStatus).toBe("missing");

    // ── Fixed deployment (key added to functions/.env.<projectId>) ───────
    process.env.TOKEN_ENCRYPTION_KEY = KEY;
    h.clock.advance(RETRY_DELAYS_MS[0]);
    await runSchedulerTick(h.deps("run-fixed", { configHealth: health() }));

    expect(h.store.get("p1")).toMatchObject({ status: "published", externalPostId: "urn:li:share:7100", lastError: null });
    expect(h.linkedin.calls.find((c) => c.url.endsWith("/ugcPosts"))!.authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
    expect(h.log.events("scheduler.config_invalid")).toHaveLength(1); // not repeated once fixed
  });
});
