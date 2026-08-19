import {
  createHash,
  generateKeyPairSync,
  sign,
  type KeyObject,
} from "node:crypto";

export const FIXED_NOW = new Date("2026-08-19T12:00:00.000Z");

export interface TestKey {
  privateKey: KeyObject;
  publicJwk: JsonWebKey;
}

export function createTestKey(): TestKey {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    privateKey,
    publicJwk: publicKey.export({ format: "jwk" }),
  };
}

export function createPayload(
  deliveryId = "whd_test",
  eventType = "repository.pushed",
): Record<string, unknown> {
  return {
    deliveryId,
    appId: "app_test",
    installationId: "i_test",
    event: {
      id: "evt_test",
      type: eventType,
      eventTime: "2026-08-19T12:00:00Z",
      payload: {
        repository: {
          id: "repo_test",
          name: "example",
        },
        refUpdates: [],
        pushedAt: "2026-08-19T12:00:00Z",
        pusher: {
          app: {
            id: "app_test",
            slug: "example",
          },
        },
        refUpdatesCount: 0,
      },
    },
  };
}

function signatureFor(
  privateKey: KeyObject,
  webhookId: string,
  timestamp: number,
  body: Uint8Array,
): string {
  const prefix = new TextEncoder().encode(`${webhookId}.${timestamp}.`);
  const signedValue = new Uint8Array(prefix.byteLength + body.byteLength);
  signedValue.set(prefix);
  signedValue.set(body, prefix.byteLength);

  const digest = createHash("sha256").update(signedValue).digest("hex");
  return sign(null, Buffer.from(digest), privateKey).toString("base64");
}

export function signedRequest(
  key: TestKey,
  options: {
    body?: string;
    deliveryId?: string;
    method?: string;
    timestamp?: number;
    contentType?: string | null;
    signature?: string;
    extraSignatures?: string[];
    headers?: HeadersInit;
  } = {},
): Request {
  const deliveryId = options.deliveryId ?? "whd_test";
  const timestamp = options.timestamp ?? Math.floor(FIXED_NOW.getTime() / 1000);
  const body = options.body ?? JSON.stringify(createPayload(deliveryId));
  const bodyBytes = new TextEncoder().encode(body);
  const signature =
    options.signature ?? signatureFor(key.privateKey, deliveryId, timestamp, bodyBytes);
  const signatures = [
    ...(options.extraSignatures ?? []),
    `v1ed,${signature}`,
  ].join(" ");

  const headers = new Headers(options.headers);
  if (options.contentType !== null) {
    headers.set("content-type", options.contentType ?? "application/json");
  }
  headers.set("webhook-id", deliveryId);
  headers.set("webhook-timestamp", String(timestamp));
  headers.set("webhook-signature", signatures);

  const init: RequestInit = {
    method: options.method ?? "POST",
    headers,
  };
  if (options.method !== "GET" && options.method !== "HEAD") {
    init.body = body;
  }
  return new Request("https://example.com/webhooks/cursor", init);
}

export function jwksResponse(
  keys: readonly JsonWebKey[],
  cacheControl = "public, max-age=600",
): Response {
  return Response.json(
    { keys },
    {
      headers: {
        "cache-control": cacheControl,
      },
    },
  );
}
