/// <reference types="@cloudflare/vitest-pool-workers/types" />

import { SELF } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const NOW = new Date("2026-08-19T12:00:00Z");

function base64(bytes: ArrayBuffer): string {
  let value = "";
  for (const byte of new Uint8Array(bytes)) {
    value += String.fromCharCode(byte);
  }
  return btoa(value);
}

async function fixture() {
  const pair = (await crypto.subtle.generateKey(
    { name: "Ed25519" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const timestamp = Math.floor(NOW.getTime() / 1000);
  const body = JSON.stringify({
    deliveryId: "whd_worker",
    appId: "app_worker",
    installationId: "i_worker",
    event: {
      id: "evt_worker",
      type: "installation.created",
      eventTime: NOW.toISOString(),
      payload: {
        installation: { id: "i_worker" },
        app: { id: "app_worker", slug: "example" },
      },
    },
  });
  const bodyBytes = new TextEncoder().encode(body);
  const prefix = new TextEncoder().encode(`whd_worker.${timestamp}.`);
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
  const request = new Request("https://example.com", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "webhook-id": "whd_worker",
      "webhook-timestamp": String(timestamp),
      "webhook-signature": `v1ed,${base64(signature)}`,
    },
    body,
  });
  return { publicJwk, request };
}

describe("workerd compatibility", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("verifies with runtime Web APIs and reuses keys across Worker requests", async () => {
    const { publicJwk, request } = await fixture();
    const fetchMock = vi.fn().mockImplementation(() =>
      Response.json(
        { keys: [publicJwk] },
        { headers: { "cache-control": "public, max-age=600" } },
      ));
    vi.stubGlobal("fetch", fetchMock);

    const first = await SELF.fetch(request.clone());
    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toMatchObject({
      deliveryId: "whd_worker",
      eventType: "installation.created",
    });

    const second = await SELF.fetch(request.clone());
    expect(second.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
