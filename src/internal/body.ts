import {
  InvalidWebhookJson,
  WebhookBodyTooLarge,
  WebhookBodyUnavailable,
} from "../errors.js";

export async function readRequestBody(
  request: Request,
  maxBodyBytes: number,
): Promise<Uint8Array> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && /^\d+$/.test(contentLength)) {
    const declaredLength = Number(contentLength);
    if (Number.isSafeInteger(declaredLength) && declaredLength > maxBodyBytes) {
      throw new WebhookBodyTooLarge(maxBodyBytes);
    }
  }

  if (request.body === null) {
    return new Uint8Array();
  }

  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = request.body.getReader();
  } catch (cause) {
    throw new WebhookBodyUnavailable({ cause });
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      totalBytes += value.byteLength;
      if (totalBytes > maxBodyBytes) {
        try {
          await reader.cancel();
        } catch {
          // The size error is authoritative.
        }
        throw new WebhookBodyTooLarge(maxBodyBytes);
      }
      chunks.push(value);
    }
  } catch (cause) {
    if (cause instanceof WebhookBodyTooLarge) {
      throw cause;
    }
    throw new WebhookBodyUnavailable({ cause });
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export function parseJsonBody(body: Uint8Array): unknown {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(body);
    return JSON.parse(text) as unknown;
  } catch (cause) {
    throw new InvalidWebhookJson({ cause });
  }
}
