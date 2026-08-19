import { WebhookKeyUnavailable } from "../errors.js";

const JWKS_URL = "https://api.cursor.com/v1/origin/keys";
const FALLBACK_TTL_MS = 10 * 60 * 1000;
const MAX_TTL_MS = 60 * 60 * 1000;
const FORCED_REFRESH_COOLDOWN_MS = 60 * 1000;

interface CachedKeys {
  keys: readonly CryptoKey[];
  expiresAt: number;
  fetchedAt: number;
}

let cachedKeys: CachedKeys | undefined;

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

async function fetchKeys(): Promise<CachedKeys> {
  try {
    const response = await fetch(JWKS_URL, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Cursor JWKS request failed with HTTP ${response.status}.`);
    }

    const value = (await response.json()) as unknown;
    if (!isRecord(value) || !Array.isArray(value.keys)) {
      throw new Error("Cursor JWKS response is malformed.");
    }

    const jwks = value.keys.filter(isEd25519Jwk);
    if (jwks.length === 0) {
      throw new Error("Cursor JWKS response contains no usable Ed25519 keys.");
    }

    const imported = await Promise.all(
      jwks.map((jwk) =>
        crypto.subtle.importKey("jwk", jwk, { name: "Ed25519" }, false, ["verify"]),
      ),
    );

    const fetchedAt = Date.now();
    return {
      keys: imported,
      fetchedAt,
      expiresAt: fetchedAt + cacheTtl(response),
    };
  } catch (cause) {
    if (cause instanceof WebhookKeyUnavailable) {
      throw cause;
    }
    throw new WebhookKeyUnavailable({ cause });
  }
}

async function refreshKeys(): Promise<CachedKeys> {
  // Do not retain the in-flight fetch promise globally. Workerd associates I/O
  // with the request that created it, so another request cannot safely await
  // that promise. The resolved CryptoKeys are safe to reuse across requests.
  const refreshed = await fetchKeys();
  cachedKeys = refreshed;
  return refreshed;
}

export async function getWebhookKeys(forceRefresh = false): Promise<readonly CryptoKey[]> {
  const now = Date.now();

  if (
    cachedKeys !== undefined &&
    ((!forceRefresh && now < cachedKeys.expiresAt) ||
      (forceRefresh && now - cachedKeys.fetchedAt < FORCED_REFRESH_COOLDOWN_MS))
  ) {
    return cachedKeys.keys;
  }

  return (await refreshKeys()).keys;
}
