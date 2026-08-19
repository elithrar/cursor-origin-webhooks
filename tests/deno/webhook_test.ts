import {
  InvalidWebhookSignature,
  verifyWebhook,
} from "../../src/index.ts";

const NOW = new Date("2026-08-19T12:00:00Z");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function base64(bytes: ArrayBuffer): string {
  let value = "";
  for (const byte of new Uint8Array(bytes)) {
    value += String.fromCharCode(byte);
  }
  return btoa(value);
}

Deno.test("verifies in Deno using its WebCrypto implementation", async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  const pair = (await crypto.subtle.generateKey(
    { name: "Ed25519" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const timestamp = Math.floor(NOW.getTime() / 1000);
  const body = JSON.stringify({
    deliveryId: "whd_deno",
    appId: "app_deno",
    installationId: "i_deno",
    event: {
      id: "evt_deno",
      type: "repository.pushed",
      eventTime: NOW.toISOString(),
      payload: {
        repository: { id: "repo_deno", name: "example" },
        refUpdates: [],
        pushedAt: NOW.toISOString(),
        pusher: { app: { id: "app_deno", slug: "example" } },
        refUpdatesCount: 0,
      },
    },
  });
  const prefix = new TextEncoder().encode(`whd_deno.${timestamp}.`);
  const bodyBytes = new TextEncoder().encode(body);
  const signed = new Uint8Array(prefix.byteLength + bodyBytes.byteLength);
  signed.set(prefix);
  signed.set(bodyBytes, prefix.byteLength);
  const digest = await crypto.subtle.digest("SHA-256", signed);
  const digestHex = Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  const signature = await crypto.subtle.sign(
    "Ed25519",
    pair.privateKey,
    new TextEncoder().encode(digestHex),
  );

  Date.now = () => NOW.getTime();
  globalThis.fetch = () =>
    Promise.resolve(
      Response.json(
        { keys: [publicJwk] },
        { headers: { "cache-control": "public, max-age=600" } },
      ),
    );

  try {
    const request = new Request("https://example.com", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "webhook-id": "whd_deno",
        "webhook-timestamp": String(timestamp),
        "webhook-signature": `v1ed,${base64(signature)}`,
      },
      body,
    });
    const webhook = await verifyWebhook(request);
    assert(webhook.deliveryId === "whd_deno", "unexpected delivery ID");

    const invalid = new Request("https://example.com", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "webhook-id": "whd_deno",
        "webhook-timestamp": String(timestamp),
        "webhook-signature": `v1ed,${base64(new Uint8Array(64).buffer)}`,
      },
      body,
    });

    let rejected = false;
    try {
      await verifyWebhook(invalid);
    } catch (error) {
      rejected = error instanceof InvalidWebhookSignature;
    }
    assert(rejected, "invalid signature was accepted");
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
  }
});
