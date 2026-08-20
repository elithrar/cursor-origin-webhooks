import { Result, type Result as ResultType } from "better-result";
import { WebhookKeyUnavailable } from "../errors.js";

const JWKS_URL = "https://api.cursor.com/v1/origin/keys";
const FALLBACK_TTL_MS = 10 * 60 * 1000;
const MAX_TTL_MS = 60 * 60 * 1000;
const FORCED_REFRESH_COOLDOWN_MS = 60 * 1000;
const FETCH_TIMEOUT_MS = 5 * 1000;
const FETCH_RETRIES = 3;
const FETCH_RETRY_DELAY_MS = 100;

interface CachedKeys {
  keys: readonly CryptoKey[];
  expiresAt: number;
  fetchedAt: number;
}

let cachedKeys: CachedKeys | undefined;
let nextRefreshSequence = 0;
let publishedRefreshSequence = 0;
let lastRefreshStartedAt = Number.NEGATIVE_INFINITY;

class RetryableJwksResponseError extends Error {
  constructor(readonly status: number) {
    super(`Cursor JWKS request failed with HTTP ${status}.`);
    this.name = "RetryableJwksResponseError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEd25519Jwk(value: unknown): value is JsonWebKey {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.kty === "OKP" &&
    value.crv === "Ed25519" &&
    typeof value.x === "string" &&
    (value.alg === undefined || value.alg === "EdDSA") &&
    (value.use === undefined || value.use === "sig")
  );
}

function cacheTtl(response: Response): number {
  const cacheControl = response.headers.get("cache-control");
  const directives = cacheControl
    ?.split(",")
    .map((directive) => directive.trim().toLowerCase().split("=", 1)[0]);
  if (directives?.includes("no-store") || directives?.includes("no-cache")) {
    return 0;
  }

  const match = cacheControl?.match(/(?:^|,)\s*max-age=(\d+)/i);
  const seconds = match?.[1] === undefined ? NaN : Number(match[1]);
  const ttl = Number.isSafeInteger(seconds) ? seconds * 1000 : FALLBACK_TTL_MS;
  return Math.min(MAX_TTL_MS, Math.max(0, ttl));
}

function unavailable(message: string): WebhookKeyUnavailable {
  return new WebhookKeyUnavailable({ cause: new Error(message) });
}

async function fetchJwksResponse(): Promise<Response> {
  const response = await fetch(JWKS_URL, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (response.status >= 500) {
    await response.body?.cancel();
    throw new RetryableJwksResponseError(response.status);
  }

  return response;
}

async function fetchKeys(): Promise<ResultType<CachedKeys, WebhookKeyUnavailable>> {
  return Result.gen(async function* () {
    const response = yield* Result.await(
      Result.tryPromise(
        {
          try: fetchJwksResponse,
          catch: (cause) => new WebhookKeyUnavailable({ cause }),
        },
        {
          retry: {
            times: FETCH_RETRIES,
            delayMs: FETCH_RETRY_DELAY_MS,
            backoff: "exponential",
            jitter: true,
          },
        },
      ),
    );
    if (!response.ok) {
      return Result.err(
        unavailable(`Cursor JWKS request failed with HTTP ${response.status}.`),
      );
    }

    const value = yield* Result.await(
      Result.tryPromise({
        try: async () => (await response.json()) as unknown,
        catch: (cause) => new WebhookKeyUnavailable({ cause }),
      }),
    );
    if (!isRecord(value) || !Array.isArray(value.keys)) {
      return Result.err(unavailable("Cursor JWKS response is malformed."));
    }

    const jwks = value.keys.filter(isEd25519Jwk);
    if (jwks.length === 0) {
      return Result.err(
        unavailable("Cursor JWKS response contains no usable Ed25519 keys."),
      );
    }

    const [imported] = await Result.partitionAsync(
      jwks.map((jwk) =>
        Result.tryPromise(() =>
          crypto.subtle.importKey(
            "jwk",
            jwk,
            { name: "Ed25519" },
            false,
            ["verify"],
          ),
        ),
      ),
    );
    if (imported.length === 0) {
      return Result.err(
        unavailable("Cursor JWKS response contains no importable Ed25519 keys."),
      );
    }

    const fetchedAt = Date.now();
    return Result.ok({
      keys: imported,
      fetchedAt,
      expiresAt: fetchedAt + cacheTtl(response),
    });
  });
}

async function refreshKeys(): Promise<ResultType<CachedKeys, WebhookKeyUnavailable>> {
  // Do not retain the in-flight fetch promise globally. Workerd associates I/O
  // with the request that created it, so another request cannot safely await
  // that promise. The resolved CryptoKeys are safe to reuse across requests.
  const refreshSequence = ++nextRefreshSequence;
  lastRefreshStartedAt = Date.now();
  const refreshed = await fetchKeys();
  if (refreshed.isOk() && refreshSequence > publishedRefreshSequence) {
    cachedKeys = refreshed.value;
    publishedRefreshSequence = refreshSequence;
  }
  return refreshed;
}

export async function getWebhookKeys(
  forceRefresh = false,
): Promise<ResultType<readonly CryptoKey[], WebhookKeyUnavailable>> {
  const now = Date.now();

  if (
    cachedKeys !== undefined &&
    ((!forceRefresh && now < cachedKeys.expiresAt) ||
      (forceRefresh && now - lastRefreshStartedAt < FORCED_REFRESH_COOLDOWN_MS))
  ) {
    return Result.ok(cachedKeys.keys);
  }

  return (await refreshKeys()).map((value) => value.keys);
}
