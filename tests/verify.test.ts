import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FIXED_NOW,
  createPayload,
  createTestKey,
  jwksResponse,
  signedRequest,
} from "./helpers.js";

async function loadLibrary() {
  return import("../src/index.js");
}

describe("verifyWebhook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("verifies a Cursor-compatible Ed25519 signature and returns a typed payload", async () => {
    const key = createTestKey();
    const fetchMock = vi.fn().mockResolvedValue(jwksResponse([key.publicJwk]));
    vi.stubGlobal("fetch", fetchMock);
    const { verifyWebhook } = await loadLibrary();

    const webhook = await verifyWebhook(signedRequest(key));

    expect(webhook.deliveryId).toBe("whd_test");
    expect(webhook.event.type).toBe("repository.pushed");
    expect(webhook.event.payload).toMatchObject({ refUpdatesCount: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.cursor.com/v1/origin/keys",
      { headers: { accept: "application/json" } },
    );
  });

  it("signs the exact raw body, including whitespace and Unicode", async () => {
    const key = createTestKey();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jwksResponse([key.publicJwk])));
    const { verifyWebhook } = await loadLibrary();
    const body = `{\n  "deliveryId": "whd_test",\n  "appId": "app_test",\n  "installationId": "i_test",\n  "event": {\n    "id": "evt_test",\n    "type": "repository.pushed",\n    "eventTime": "2026-08-19T12:00:00Z",\n    "payload": {\n      "repository": {},\n      "refUpdates": [],\n      "pushedAt": "2026-08-19T12:00:00Z",\n      "pusher": {},\n      "refUpdatesCount": 0,\n      "note": "héllo 🌍"\n    }\n  }\n}\n`;

    await expect(verifyWebhook(signedRequest(key, { body }))).resolves.toMatchObject({
      deliveryId: "whd_test",
    });
  });

  it("uses every active key and accepts any valid v1ed signature", async () => {
    const oldKey = createTestKey();
    const activeKey = createTestKey();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jwksResponse([oldKey.publicJwk, activeKey.publicJwk])),
    );
    const { verifyWebhook } = await loadLibrary();
    const invalidSignature = Buffer.alloc(64, 7).toString("base64");

    await expect(
      verifyWebhook(
        signedRequest(activeKey, {
          extraSignatures: [`v1ed,${invalidSignature}`, "v0,ignored"],
        }),
      ),
    ).resolves.toMatchObject({ deliveryId: "whd_test" });
  });

  it.each([
    ["repository.pushed", {
      repository: {},
      refUpdates: [],
      pushedAt: "2026-08-19T12:00:00Z",
      pusher: {},
      refUpdatesCount: 0,
    }],
    ["pull_request.created", { pullRequest: {}, repository: {} }],
    ["pull_request.head_ref.pushed", { pullRequest: {}, repository: {} }],
    ["pull_request.base_ref.updated", { pullRequest: {}, repository: {} }],
    ["pull_request.metadata.updated", { pullRequest: {}, repository: {} }],
    ["pull_request.closed", { pullRequest: {}, repository: {} }],
    ["pull_request.merged", { pullRequest: {}, repository: {} }],
    ["pull_request.reopened", { pullRequest: {}, repository: {} }],
    ["pull_request.published", { pullRequest: {}, repository: {} }],
    ["pull_request.comment.created", { pullRequest: {}, comment: {} }],
    ["pull_request.review.submitted", { pullRequest: {}, review: {} }],
    [
      "pull_request.reviewer.added",
      {
        pullRequest: {},
        reviewer: {},
        createdVia: "manual",
        createdAt: "2026-08-19T12:00:00Z",
      },
    ],
    [
      "pull_request.reviewer.removed",
      {
        pullRequest: {},
        reviewer: {},
        createdVia: "codeowners",
        createdBy: {},
        createdAt: "2026-08-19T12:00:00Z",
      },
    ],
    [
      "pull_request.reviewer.rerequested",
      {
        pullRequest: {},
        reviewer: {},
        createdVia: "CREATED_VIA_UNSPECIFIED",
        createdAt: "2026-08-19T12:00:00Z",
      },
    ],
    [
      "repository.check_run.created",
      { repository: {}, checkSuite: {}, checkRun: {}, actor: {} },
    ],
    [
      "repository.check_run.completed",
      { repository: {}, checkSuite: {}, checkRun: {}, actor: {} },
    ],
    ["installation.created", { installation: {}, app: {} }],
    ["installation.updated", { installation: {}, app: {} }],
    ["installation.deleted", { installation: {}, app: {} }],
  ])("accepts the documented %s payload family", async (eventType, payload) => {
    const key = createTestKey();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jwksResponse([key.publicJwk])));
    const { verifyWebhook } = await loadLibrary();
    const envelope = createPayload("whd_test", eventType);
    const event = envelope.event as Record<string, unknown>;
    event.payload = payload;

    await expect(
      verifyWebhook(signedRequest(key, { body: JSON.stringify(envelope) })),
    ).resolves.toMatchObject({
      event: { type: eventType },
    });
  });

  it("reuses imported keys while the JWKS cache is fresh", async () => {
    const key = createTestKey();
    const fetchMock = vi.fn().mockResolvedValue(jwksResponse([key.publicJwk]));
    vi.stubGlobal("fetch", fetchMock);
    const { verifyWebhook } = await loadLibrary();

    await verifyWebhook(signedRequest(key));
    await verifyWebhook(signedRequest(key));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(["no-store", "no-cache"])(
    "does not reuse keys when Cache-Control contains %s",
    async (directive) => {
      const key = createTestKey();
      const fetchMock = vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(jwksResponse([key.publicJwk], `public, ${directive}`)),
        );
      vi.stubGlobal("fetch", fetchMock);
      const { verifyWebhook } = await loadLibrary();

      await verifyWebhook(signedRequest(key));
      await verifyWebhook(signedRequest(key));

      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it("refreshes expired keys using the response cache lifetime", async () => {
    const key = createTestKey();
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(jwksResponse([key.publicJwk], "public, max-age=30")),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { verifyWebhook } = await loadLibrary();

    await verifyWebhook(signedRequest(key));
    vi.advanceTimersByTime(31_000);
    await verifyWebhook(signedRequest(key, {
      timestamp: Math.floor(Date.now() / 1000),
    }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails closed instead of using expired keys when refresh fails", async () => {
    const key = createTestKey();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jwksResponse([key.publicJwk], "public, max-age=1"))
      .mockRejectedValueOnce(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);
    const { WebhookKeyUnavailable, verifyWebhook } = await loadLibrary();

    await verifyWebhook(signedRequest(key));
    vi.advanceTimersByTime(2_000);

    await expect(
      verifyWebhook(signedRequest(key, {
        timestamp: Math.floor(Date.now() / 1000),
      })),
    ).rejects.toBeInstanceOf(WebhookKeyUnavailable);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refreshes once after a likely key rotation", async () => {
    const oldKey = createTestKey();
    const newKey = createTestKey();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jwksResponse([oldKey.publicJwk]))
      .mockResolvedValueOnce(jwksResponse([newKey.publicJwk]));
    vi.stubGlobal("fetch", fetchMock);
    const { verifyWebhook } = await loadLibrary();

    await verifyWebhook(signedRequest(oldKey));
    vi.advanceTimersByTime(61_000);

    await expect(
      verifyWebhook(signedRequest(newKey, {
        timestamp: Math.floor(Date.now() / 1000),
      })),
    ).resolves.toMatchObject({ deliveryId: "whd_test" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not amplify invalid signatures into repeated JWKS fetches", async () => {
    const key = createTestKey();
    const fetchMock = vi.fn().mockResolvedValue(jwksResponse([key.publicJwk]));
    vi.stubGlobal("fetch", fetchMock);
    const { InvalidWebhookSignature, verifyWebhook } = await loadLibrary();
    const badSignature = Buffer.alloc(64).toString("base64");

    await expect(
      verifyWebhook(signedRequest(key, { signature: badSignature })),
    ).rejects.toBeInstanceOf(InvalidWebhookSignature);
    await expect(
      verifyWebhook(signedRequest(key, { signature: badSignature })),
    ).rejects.toBeInstanceOf(InvalidWebhookSignature);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails closed when the initial JWKS fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const { WebhookKeyUnavailable, verifyWebhook } = await loadLibrary();
    const key = createTestKey();

    await expect(verifyWebhook(signedRequest(key))).rejects.toBeInstanceOf(
      WebhookKeyUnavailable,
    );
  });

  it("rejects malformed or empty JWKS documents", async () => {
    const key = createTestKey();
    for (const response of [
      Response.json({}),
      Response.json({ keys: [] }),
      Response.json({ keys: [{ kty: "RSA" }] }),
      new Response("no", { status: 503 }),
    ]) {
      vi.resetModules();
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
      const { WebhookKeyUnavailable, verifyWebhook } = await loadLibrary();
      await expect(verifyWebhook(signedRequest(key))).rejects.toBeInstanceOf(
        WebhookKeyUnavailable,
      );
    }
  });

  it.each([
    ["wrong version", `v1,${Buffer.alloc(64).toString("base64")}`],
    ["invalid base64", "v1ed,%%%"],
    ["wrong length", `v1ed,${Buffer.alloc(32).toString("base64")}`],
  ])("rejects %s signatures", async (_label, signatureHeader) => {
    const key = createTestKey();
    const fetchMock = vi.fn().mockResolvedValue(jwksResponse([key.publicJwk]));
    vi.stubGlobal("fetch", fetchMock);
    const { InvalidWebhookSignature, verifyWebhook } = await loadLibrary();
    const request = signedRequest(key);
    request.headers.set("webhook-signature", signatureHeader);

    await expect(verifyWebhook(request)).rejects.toBeInstanceOf(
      InvalidWebhookSignature,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("authenticates before parsing JSON", async () => {
    const key = createTestKey();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jwksResponse([key.publicJwk])));
    const {
      InvalidWebhookJson,
      InvalidWebhookSignature,
      verifyWebhook,
    } = await loadLibrary();

    await expect(
      verifyWebhook(signedRequest(key, { body: "{", signature: Buffer.alloc(64).toString("base64") })),
    ).rejects.toBeInstanceOf(InvalidWebhookSignature);
    await expect(
      verifyWebhook(signedRequest(key, { body: "{" })),
    ).rejects.toBeInstanceOf(InvalidWebhookJson);
  });

  it("uses the exact timestamp header bytes in the signed message", async () => {
    const key = createTestKey();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jwksResponse([key.publicJwk])));
    const { verifyWebhook } = await loadLibrary();
    const timestamp = Math.floor(FIXED_NOW.getTime() / 1000);
    const request = signedRequest(key, { timestamp });
    const paddedTimestamp = `0${timestamp}`;
    const body = new Uint8Array(await request.clone().arrayBuffer());
    const { createHash, sign } = await import("node:crypto");
    const prefix = new TextEncoder().encode(`whd_test.${paddedTimestamp}.`);
    const signedValue = new Uint8Array(prefix.byteLength + body.byteLength);
    signedValue.set(prefix);
    signedValue.set(body, prefix.byteLength);
    const digest = createHash("sha256").update(signedValue).digest("hex");
    const signature = sign(null, Buffer.from(digest), key.privateKey).toString("base64");
    request.headers.set("webhook-timestamp", paddedTimestamp);
    request.headers.set("webhook-signature", `v1ed,${signature}`);

    await expect(verifyWebhook(request)).resolves.toMatchObject({
      deliveryId: "whd_test",
    });
  });

  it.each([
    ["GET requests", "method"],
    ["missing content type", "content-type"],
    ["missing webhook-id", "webhook-id"],
    ["missing webhook-timestamp", "webhook-timestamp"],
    ["missing webhook-signature", "webhook-signature"],
  ])("rejects %s before fetching keys", async (_label, failure) => {
    const key = createTestKey();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const api = await loadLibrary();
    const options: Parameters<typeof signedRequest>[1] = {};
    if (failure === "method") {
      options.method = "GET";
    }
    if (failure === "content-type") {
      options.contentType = null;
    }
    const request = signedRequest(key, options);
    if (failure.startsWith("webhook-")) {
      request.headers.delete(failure);
    }

    await expect(api.verifyWebhook(request)).rejects.toBeInstanceOf(
      failure === "method"
        ? api.InvalidWebhookMethod
        : failure === "content-type"
          ? api.InvalidWebhookContentType
          : api.MissingWebhookHeader,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts application/json parameters and rejects other media types", async () => {
    const key = createTestKey();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jwksResponse([key.publicJwk])));
    const { verifyWebhook } = await loadLibrary();

    await expect(
      verifyWebhook(signedRequest(key, { contentType: "Application/JSON; charset=utf-8" })),
    ).resolves.toBeDefined();

    vi.resetModules();
    const next = await loadLibrary();
    await expect(
      next.verifyWebhook(signedRequest(key, { contentType: "text/plain" })),
    ).rejects.toBeInstanceOf(next.InvalidWebhookContentType);
  });

  it("rejects malformed and stale timestamps before reading keys", async () => {
    const key = createTestKey();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { InvalidWebhookTimestamp, verifyWebhook } = await loadLibrary();

    for (const timestamp of ["not-a-number", "-1", "1.5", String(Number.MAX_VALUE)]) {
      const request = signedRequest(key);
      request.headers.set("webhook-timestamp", timestamp);
      await expect(verifyWebhook(request)).rejects.toBeInstanceOf(
        InvalidWebhookTimestamp,
      );
    }

    await expect(
      verifyWebhook(signedRequest(key, {
        timestamp: Math.floor(FIXED_NOW.getTime() / 1000) - 301,
      })),
    ).rejects.toBeInstanceOf(InvalidWebhookTimestamp);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("supports a caller-selected timestamp tolerance", async () => {
    const key = createTestKey();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jwksResponse([key.publicJwk])));
    const { verifyWebhook } = await loadLibrary();

    await expect(
      verifyWebhook(
        signedRequest(key, {
          timestamp: Math.floor(FIXED_NOW.getTime() / 1000) - 600,
        }),
        { timestampToleranceSeconds: 600 },
      ),
    ).resolves.toBeDefined();
  });

  it("rejects bodies over the declared or streamed byte limit", async () => {
    const key = createTestKey();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { WebhookBodyTooLarge, verifyWebhook } = await loadLibrary();

    const declared = signedRequest(key);
    declared.headers.set("content-length", "1000");
    await expect(
      verifyWebhook(declared, { maxBodyBytes: 10 }),
    ).rejects.toBeInstanceOf(WebhookBodyTooLarge);

    await expect(
      verifyWebhook(signedRequest(key), { maxBodyBytes: 10 }),
    ).rejects.toBeInstanceOf(WebhookBodyTooLarge);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an already-consumed request body", async () => {
    const key = createTestKey();
    vi.stubGlobal("fetch", vi.fn());
    const { WebhookBodyUnavailable, verifyWebhook } = await loadLibrary();
    const request = signedRequest(key);
    await request.text();

    await expect(verifyWebhook(request)).rejects.toBeInstanceOf(
      WebhookBodyUnavailable,
    );
  });

  it.each([
    ["non-object body", []],
    ["wrong delivery", createPayload("other_delivery")],
    ["missing app", { ...createPayload(), appId: undefined }],
    ["unknown event", createPayload("whd_test", "future.event")],
    [
      "non-object payload",
      {
        ...createPayload(),
        event: {
          ...(createPayload().event as Record<string, unknown>),
          payload: null,
        },
      },
    ],
  ])("rejects authenticated payloads with %s", async (_label, payload) => {
    const key = createTestKey();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jwksResponse([key.publicJwk])));
    const { InvalidWebhookPayload, verifyWebhook } = await loadLibrary();

    await expect(
      verifyWebhook(signedRequest(key, { body: JSON.stringify(payload) })),
    ).rejects.toBeInstanceOf(InvalidWebhookPayload);
  });

  it("validates option values as caller errors", async () => {
    const key = createTestKey();
    vi.stubGlobal("fetch", vi.fn());
    const { verifyWebhook } = await loadLibrary();

    await expect(
      verifyWebhook(signedRequest(key), { maxBodyBytes: 0 }),
    ).rejects.toBeInstanceOf(RangeError);
    await expect(
      verifyWebhook(signedRequest(key), { timestampToleranceSeconds: -1 }),
    ).rejects.toBeInstanceOf(RangeError);
  });
});
