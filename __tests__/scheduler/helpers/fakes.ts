// Test doubles for the scheduler: an in-memory store with real transaction
// semantics (per-document mutex, same transition code as Firestore), a fake
// LinkedIn API that behaves like the real one on the points that matter
// (creates shares, rejects duplicates naming the original URN, can lose a
// response after applying it), and a fake connection/storage layer.

import { Timestamp } from "firebase-admin/firestore";
import { encryptToken } from "../../../functions/src/crypto/token-cipher";
import type { SchedulerLogger, Severity } from "../../../functions/src/scheduler/logger";
import { PUBLISHERS } from "../../../functions/src/scheduler/publishers";
import type { PlatformDataAccess } from "../../../functions/src/scheduler/publishers/types";
import type { FetchLike } from "../../../functions/src/scheduler/http";
import type { SchedulerDeps, SeedCommentRequest } from "../../../functions/src/scheduler/run";
import {
  TransactionalSchedulerStore,
  type DocMutation,
  type DueRef,
  type SchedulerHeartbeat,
} from "../../../functions/src/scheduler/store";
import { toMillis } from "../../../functions/src/scheduler/store-mapping";

export const USER = "user_alice";
export const LINKEDIN_ID = "AbC123";
export const T0 = Date.UTC(2026, 8, 30, 8, 0, 0); // 2026-09-30T08:00:00Z (10:00 Paris)

export class Clock {
  constructor(public now: number = T0) {}
  advance(ms: number): void {
    this.now += ms;
  }
}

/** Same query + transaction semantics as FirestoreSchedulerStore, in memory. */
export class MemorySchedulerStore extends TransactionalSchedulerStore {
  readonly docs = new Map<string, Record<string, unknown>>();
  readonly heartbeats: SchedulerHeartbeat[] = [];
  private readonly locks = new Map<string, Promise<void>>();

  protected async runOnDoc<T>(id: string, mutation: DocMutation<T>): Promise<T> {
    const previous = this.locks.get(id) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(id, previous.then(() => current));
    await previous;
    try {
      // Yield like a real round-trip so concurrent transactions interleave.
      await new Promise((resolve) => setImmediate(resolve));
      const data = this.docs.get(id) ?? null;
      const { result, update } = mutation(data);
      if (update && data) this.docs.set(id, { ...data, ...update });
      return result;
    } finally {
      release();
    }
  }

  async listDue(nowMs: number, limit: number): Promise<DueRef[]> {
    const first: Array<[string, number]> = [];
    const retries: Array<[string, number]> = [];
    for (const [id, d] of this.docs) {
      if (d.status === "pending") {
        const at = toMillis(d.scheduledAt);
        if (at !== null && at <= nowMs) first.push([id, at]);
      } else if (d.status === "retrying") {
        const next = toMillis(d.nextAttemptAt);
        if (next === null || next <= nowMs) retries.push([id, next ?? 0]);
      }
    }
    first.sort((a, b) => a[1] - b[1]);
    retries.sort((a, b) => a[1] - b[1]);
    return [
      ...first.slice(0, limit).map(([id]) => ({ id, kind: "first_attempt" as const })),
      ...retries.slice(0, limit).map(([id]) => ({ id, kind: "retry" as const })),
    ];
  }

  async listExpiredLeases(nowMs: number, limit: number): Promise<string[]> {
    const out: string[] = [];
    for (const [id, d] of this.docs) {
      if (d.status !== "processing") continue;
      const lease = toMillis(d.leaseExpiresAt);
      if (lease === null || lease <= nowMs) out.push(id);
    }
    return out.slice(0, limit);
  }

  async writeHeartbeat(heartbeat: SchedulerHeartbeat): Promise<void> {
    this.heartbeats.push(heartbeat);
  }

  get(id: string): Record<string, unknown> {
    const doc = this.docs.get(id);
    if (!doc) throw new Error(`no doc ${id}`);
    return doc;
  }
}

/** A scheduledPosts document exactly as the app writes it (createScheduledPost). */
export function scheduledPostDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    userId: USER,
    content: "Scheduled post body",
    postId: null,
    title: null,
    scheduledAt: Timestamp.fromMillis(T0),
    timezone: "Europe/Paris",
    status: "pending",
    platform: "linkedin",
    postType: "feed",
    createdAt: Timestamp.fromMillis(T0 - 86_400_000),
    updatedAt: Timestamp.fromMillis(T0 - 86_400_000),
    attemptCount: 0,
    publishedAt: null,
    publishedUrl: null,
    lastAttemptAt: null,
    failureReason: null,
    visibility: "PUBLIC",
    ...overrides,
  };
}

export class FakePlatformData implements PlatformDataAccess {
  readonly connections = new Map<string, Record<string, unknown>>();
  readonly records = new Map<string, Record<string, unknown>>();
  readonly files = new Map<string, Buffer>();
  readonly downloads: string[] = [];

  setConnection(collection: string, userId: string, data: Record<string, unknown>): void {
    this.connections.set(`${collection}/${userId}`, data);
  }
  async getConnection(collection: string, userId: string) {
    return this.connections.get(`${collection}/${userId}`) ?? null;
  }
  async updateConnection(collection: string, userId: string, patch: Record<string, unknown>) {
    const key = `${collection}/${userId}`;
    this.connections.set(key, { ...(this.connections.get(key) ?? {}), ...patch });
  }
  async recordPublishedPost(collection: string, docId: string, data: Record<string, unknown>) {
    const key = `${collection}/${docId}`;
    this.records.set(key, { ...(this.records.get(key) ?? {}), ...data });
  }
  async downloadStorageFile(storagePath: string) {
    this.downloads.push(storagePath);
    return this.files.get(storagePath) ?? null;
  }
  encryptToken(plaintext: string): string {
    return encryptToken(plaintext);
  }
  timestamp(ms: number): unknown {
    return Timestamp.fromMillis(ms);
  }
}

/** A LinkedIn connection as saved by the app (token encrypted or legacy plaintext). */
export function linkedInConnection(accessToken: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    userId: USER,
    linkedInId: LINKEDIN_ID,
    accessToken,
    expiresAt: Timestamp.fromMillis(T0 + 30 * 86_400_000),
    organizations: [],
    ...overrides,
  };
}

type UgcStep =
  | "ok"
  /** LinkedIn creates the share but the response never arrives (timeout). */
  | "timeout_after_create"
  /** The connection drops before anything reaches LinkedIn. */
  | "refused_before_send"
  | { status: number; body?: string; headers?: Record<string, string> };

/** The ugcPosts create payload built by publishers/linkedin.ts. */
interface UgcPostBody {
  author: string;
  specificContent: {
    "com.linkedin.ugc.ShareContent": {
      shareCommentary: { text: string };
      media?: Array<{ media: string }>;
    };
  };
  visibility: { "com.linkedin.ugc.MemberNetworkVisibility": string };
}

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

/** Behaviourally faithful fake of the LinkedIn endpoints the scheduler uses. */
export class FakeLinkedIn {
  readonly shares: Array<{ urn: string; author: string; text: string; media: string[]; visibility: string }> = [];
  readonly calls: Array<{ method: string; url: string; body?: unknown; authorization?: string }> = [];
  readonly ugcScript: UgcStep[] = [];
  readonly registerScript: Array<{ status: number; body?: string }> = [];
  readonly comments: Array<{ parent: string; text: string }> = [];
  private assetSeq = 0;

  get ugcCreateCalls(): number {
    return this.calls.filter((c) => c.method === "POST" && c.url.endsWith("/ugcPosts")).length;
  }

  readonly fetch: FetchLike = async (url, init) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const headers = (init?.headers ?? {}) as Record<string, string>;
    let body: unknown;
    if (typeof init?.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }
    this.calls.push({ method, url, body, authorization: headers.Authorization });

    if (method === "POST" && url.endsWith("/ugcPosts")) return this.createShare(body as UgcPostBody);
    if (method === "POST" && url.includes("/assets?action=registerUpload")) {
      const scripted = this.registerScript.shift();
      if (scripted) return new Response(scripted.body ?? "", { status: scripted.status });
      const n = ++this.assetSeq;
      return json(200, {
        value: {
          asset: `urn:li:digitalmediaAsset:A${n}`,
          uploadMechanism: {
            "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": { uploadUrl: `https://upload.fake/A${n}` },
          },
        },
      });
    }
    if (method === "PUT" && url.startsWith("https://upload.fake/")) return new Response(null, { status: 201 });
    if (method === "POST" && url.includes("/socialActions/")) {
      const b = body as { object: string; message: { text: string } };
      this.comments.push({ parent: b.object, text: b.message.text });
      return json(201, { $URN: `urn:li:comment:(${b.object},${this.comments.length})` });
    }
    if (method === "GET") return json(200, {});
    return json(404, { message: "not found" });
  };

  private createShare(body: UgcPostBody): Response {
    const step = this.ugcScript.shift() ?? "ok";
    if (step === "refused_before_send") {
      throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } });
    }
    if (typeof step === "object") return new Response(step.body ?? "", { status: step.status, headers: step.headers });

    const content = body.specificContent["com.linkedin.ugc.ShareContent"];
    const text = content.shareCommentary.text;
    const author = body.author;
    const existing = this.shares.find((s) => s.author === author && s.text === text);
    if (existing) {
      return json(422, {
        serviceErrorCode: 0,
        message: `Content is a duplicate of ${existing.urn}`,
        status: 422,
      });
    }
    const urn = `urn:li:share:7${String(100 + this.shares.length).padStart(3, "0")}`;
    this.shares.push({
      urn,
      author,
      text,
      media: (content.media ?? []).map((m) => m.media),
      visibility: body.visibility["com.linkedin.ugc.MemberNetworkVisibility"],
    });
    if (step === "timeout_after_create") {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    }
    return json(201, { id: urn }, { "x-restli-id": urn });
  }
}

export interface LogEntry {
  severity: Severity;
  event: string;
  fields: Record<string, unknown>;
}

export class MemoryLogger implements SchedulerLogger {
  readonly entries: LogEntry[] = [];
  log(severity: Severity, event: string, fields: Record<string, unknown> = {}): void {
    this.entries.push({ severity, event, fields });
  }
  events(event: string): LogEntry[] {
    return this.entries.filter((e) => e.event === event);
  }
}

export interface Harness {
  clock: Clock;
  store: MemorySchedulerStore;
  data: FakePlatformData;
  linkedin: FakeLinkedIn;
  log: MemoryLogger;
  seeds: SeedCommentRequest[];
  deleted: string[];
  deps(runId?: string, overrides?: Partial<SchedulerDeps>): SchedulerDeps;
}

export function createHarness(): Harness {
  const clock = new Clock();
  const store = new MemorySchedulerStore();
  const data = new FakePlatformData();
  const linkedin = new FakeLinkedIn();
  const log = new MemoryLogger();
  const seeds: SeedCommentRequest[] = [];
  const deleted: string[] = [];
  const instant = async () => undefined;
  const deps = (runId = "run-1", overrides: Partial<SchedulerDeps> = {}): SchedulerDeps => ({
    store,
    publishers: PUBLISHERS,
    platform: {
      data,
      fetch: linkedin.fetch,
      config: {
        linkedinApiBaseUrl: "https://api.linkedin.com/v2",
        facebookApiUrl: "https://graph.facebook.com/v21.0",
        threadsApiUrl: "https://graph.threads.net/v1.0",
        threadsRefreshUrl: "https://graph.threads.net/refresh_access_token",
      },
      now: () => clock.now,
      sleep: instant,
      random: () => 0.5,
      log,
    },
    enqueueSeedComment: async (request) => {
      if (seeds.some((s) => s.scheduledPostId === request.scheduledPostId)) return "exists";
      seeds.push(request);
      return "created";
    },
    deleteStorageFile: async (path) => {
      deleted.push(path);
    },
    now: () => clock.now,
    sleep: instant,
    random: () => 0.5,
    log,
    runId,
    deadlineMs: clock.now + 480_000,
    configHealth: { encryptionKeyStatus: "ok", zernioKeyStatus: "ok" },
    ...overrides,
  });
  return { clock, store, data, linkedin, log, seeds, deleted, deps };
}
