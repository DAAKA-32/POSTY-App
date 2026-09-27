import type { FetchLike } from "../http";
import type { SchedulerLogger } from "../logger";
import type { PublishWarning, ScheduledPostImage, SchedulerPlatform } from "../types";

/** Everything an adapter needs to publish one claimed post. */
export interface PublishContext {
  postId: string;
  userId: string;
  platform: SchedulerPlatform;
  content: string;
  images: ScheduledPostImage[];
  visibility: "PUBLIC" | "CONNECTIONS";
  organizationUrn: string | null;
  reddit: { subreddit: string | null; title: string | null };
  attempt: number;
  /**
   * An earlier attempt sent the create call and never learned the outcome.
   * Adapters that can reconcile (LinkedIn, Threads) use it to recognise their
   * own earlier publication instead of reporting a duplicate.
   */
  priorSendUncertain: boolean;
  /** Platform-specific data persisted by an earlier attempt's `beforeSend`. */
  resumeState: Record<string, string>;
  /** Absolute epoch-ms deadline; no network step may start past it. */
  deadlineMs: number;
  /**
   * MUST be awaited right before the non-idempotent create call. Persists
   * stage=sending (+ `resumeState`) and throws `LeaseLostError` if this run no
   * longer owns the post — in which case nothing must be sent.
   */
  beforeSend(resumeState?: Record<string, string>): Promise<void>;
}

export interface PublishSuccess {
  externalPostId: string | null;
  publishedUrl: string | null;
  /** True when the publication was recognised from an earlier attempt. */
  reconciled: boolean;
  warnings: PublishWarning[];
  /** LinkedIn only — used to enqueue the seed comment. */
  linkedinSeed?: { shareUrn: string; actorUrn: string };
}

/** Data access used by adapters — Firestore/Storage in prod, fakes in tests. */
export interface PlatformDataAccess {
  getConnection(collection: string, userId: string): Promise<Record<string, unknown> | null>;
  updateConnection(collection: string, userId: string, patch: Record<string, unknown>): Promise<void>;
  /** Idempotent: `docId` is derived from the scheduled post id. */
  recordPublishedPost(collection: string, docId: string, data: Record<string, unknown>): Promise<void>;
  /** Resolves null when the object does not exist. */
  downloadStorageFile(storagePath: string): Promise<Buffer | null>;
  encryptToken(plaintext: string): string;
  /** Epoch ms → the store's timestamp type. */
  timestamp(ms: number): unknown;
}

export interface PlatformConfig {
  linkedinApiBaseUrl: string;
  facebookApiUrl: string;
  threadsApiUrl: string;
  threadsRefreshUrl: string;
}

export interface PlatformDeps {
  data: PlatformDataAccess;
  fetch: FetchLike;
  config: PlatformConfig;
  now(): number;
  sleep(ms: number): Promise<void>;
  random(): number;
  log: SchedulerLogger;
  /** Registers fire-and-forget work the run awaits (bounded) before exiting. */
  background(task: Promise<unknown>): void;
}

export type Publisher = (ctx: PublishContext, deps: PlatformDeps) => Promise<PublishSuccess>;
