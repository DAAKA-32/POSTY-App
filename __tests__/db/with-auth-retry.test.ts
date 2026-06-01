import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * These tests pin down the exact recovery semantics that fix the
 * "blank account after password reset" bug: a `permission-denied` from a stale
 * ID token must be recovered by force-refreshing the token and retrying ONCE,
 * so the user's intact Firestore data (profile, subscription, conversations,
 * connected accounts) loads instead of falling back to an empty state.
 */

// vi.mock is hoisted above imports, so the mutable auth stub must be created
// inside vi.hoisted to exist when the factory runs.
const { mockAuth } = vi.hoisted(() => ({
  mockAuth: { currentUser: null as null | { getIdToken: (force: boolean) => Promise<string> } },
}));

vi.mock("@/lib/db/firebase", () => ({ auth: mockAuth }));

import { readWithAuthRetry } from "@/lib/db/with-auth-retry";

function permissionDenied(): Error & { code: string } {
  const err = new Error("Missing or insufficient permissions.") as Error & { code: string };
  err.code = "permission-denied";
  return err;
}

describe("readWithAuthRetry", () => {
  beforeEach(() => {
    mockAuth.currentUser = null;
  });

  it("returns the value and never refreshes on the happy path", async () => {
    const getIdToken = vi.fn().mockResolvedValue("fresh");
    mockAuth.currentUser = { getIdToken };

    const fn = vi.fn().mockResolvedValue({ plan: "max" });
    const result = await readWithAuthRetry(fn);

    expect(result).toEqual({ plan: "max" });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(getIdToken).not.toHaveBeenCalled();
  });

  it("recovers from permission-denied: force-refreshes the token and retries once", async () => {
    const getIdToken = vi.fn().mockResolvedValue("fresh-token");
    mockAuth.currentUser = { getIdToken };

    // First read fails with the stale-token error, the retry succeeds with the
    // user's real data — exactly the post-password-reset scenario.
    const fn = vi
      .fn()
      .mockRejectedValueOnce(permissionDenied())
      .mockResolvedValueOnce({ id: "u1", subscription: { plan: "max" } });

    const result = await readWithAuthRetry(fn);

    expect(result).toEqual({ id: "u1", subscription: { plan: "max" } });
    expect(fn).toHaveBeenCalledTimes(2);
    expect(getIdToken).toHaveBeenCalledTimes(1);
    expect(getIdToken).toHaveBeenCalledWith(true); // force = true
  });

  it("does NOT retry when no user is signed in (genuine permission error)", async () => {
    mockAuth.currentUser = null;
    const fn = vi.fn().mockRejectedValue(permissionDenied());

    await expect(readWithAuthRetry(fn)).rejects.toMatchObject({ code: "permission-denied" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry on non-permission errors", async () => {
    const getIdToken = vi.fn().mockResolvedValue("fresh");
    mockAuth.currentUser = { getIdToken };

    const other = Object.assign(new Error("offline"), { code: "unavailable" });
    const fn = vi.fn().mockRejectedValue(other);

    await expect(readWithAuthRetry(fn)).rejects.toBe(other);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(getIdToken).not.toHaveBeenCalled();
  });

  it("propagates the error if the retry also fails (no infinite loop)", async () => {
    const getIdToken = vi.fn().mockResolvedValue("fresh");
    mockAuth.currentUser = { getIdToken };

    const fn = vi.fn().mockRejectedValue(permissionDenied());

    await expect(readWithAuthRetry(fn)).rejects.toMatchObject({ code: "permission-denied" });
    expect(fn).toHaveBeenCalledTimes(2); // exactly one retry, then give up
    expect(getIdToken).toHaveBeenCalledTimes(1);
  });

  it("still retries even if the token refresh itself rejects", async () => {
    const getIdToken = vi.fn().mockRejectedValue(new Error("network"));
    mockAuth.currentUser = { getIdToken };

    const fn = vi
      .fn()
      .mockRejectedValueOnce(permissionDenied())
      .mockResolvedValueOnce("recovered");

    const result = await readWithAuthRetry(fn);

    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
