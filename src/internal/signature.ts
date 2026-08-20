import { Result, type Result as ResultType } from "better-result";
import {
  InvalidWebhookSignature,
  type WebhookKeyUnavailable,
} from "../errors.js";
import { getWebhookKeys } from "./jwks.js";

const ED25519_SIGNATURE_BYTES = 64;
const MAX_SIGNATURES = 8;

function decodeBase64(value: string): Uint8Array<ArrayBuffer> | undefined {
  if (
    value.length === 0 ||
    value.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(value)
  ) {
    return undefined;
  }

  const decoded = Result.try(() => atob(value));
  if (decoded.isErr()) {
    return undefined;
  }

  const bytes = new Uint8Array(decoded.value.length);
  for (let index = 0; index < decoded.value.length; index += 1) {
    bytes[index] = decoded.value.charCodeAt(index);
  }
  return bytes.byteLength === ED25519_SIGNATURE_BYTES ? bytes : undefined;
}

function parseSignatures(header: string): readonly Uint8Array<ArrayBuffer>[] {
  return header
    .trim()
    .split(/\s+/)
    .filter((value) => value.startsWith("v1ed,"))
    .map((value) => decodeBase64(value.slice(5)))
    .filter((value): value is Uint8Array<ArrayBuffer> => value !== undefined)
    .slice(0, MAX_SIGNATURES);
}

function signedBytes(
  id: string,
  timestamp: string,
  body: Uint8Array,
): Uint8Array<ArrayBuffer> {
  const prefix = new TextEncoder().encode(`${id}.${timestamp}.`);
  const value = new Uint8Array(prefix.byteLength + body.byteLength);
  value.set(prefix);
  value.set(body, prefix.byteLength);
  return value;
}

function lowercaseHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyWithKeys(
  keys: readonly CryptoKey[],
  signatures: readonly Uint8Array<ArrayBuffer>[],
  message: Uint8Array<ArrayBuffer>,
): Promise<boolean> {
  for (const key of keys) {
    for (const signature of signatures) {
      const verified = await Result.tryPromise(() =>
        crypto.subtle.verify("Ed25519", key, signature, message),
      );
      if (verified.isOk() && verified.value) {
        return true;
      }
      // Ignore a key/signature pair that the runtime cannot verify and try
      // the remaining active keys.
    }
  }
  return false;
}

export async function verifySignature(
  id: string,
  timestamp: string,
  signatureHeader: string,
  body: Uint8Array,
): Promise<ResultType<void, InvalidWebhookSignature | WebhookKeyUnavailable>> {
  const signatures = parseSignatures(signatureHeader);
  if (signatures.length === 0) {
    return Result.err(new InvalidWebhookSignature());
  }

  const digest = await crypto.subtle.digest("SHA-256", signedBytes(id, timestamp, body));
  const message = new TextEncoder().encode(lowercaseHex(digest));
  const keys = await getWebhookKeys();
  if (keys.isErr()) {
    return keys;
  }

  if (await verifyWithKeys(keys.value, signatures, message)) {
    return Result.ok();
  }

  const refreshedKeys = await getWebhookKeys(true);
  if (
    refreshedKeys.isOk() &&
    await verifyWithKeys(refreshedKeys.value, signatures, message)
  ) {
    return Result.ok();
  }
  // A still-fresh key set was available. Preserve the authentication result
  // instead of turning an invalid request into a remote availability error.

  return Result.err(new InvalidWebhookSignature());
}
