import { Result, type Result as ResultType } from "better-result";
import {
  InvalidWebhookJson,
  WebhookBodyTooLarge,
  WebhookBodyUnavailable,
} from "../errors.js";

type ReadRequestBodyError = WebhookBodyTooLarge | WebhookBodyUnavailable;

export async function readRequestBody(
  request: Request,
  maxBodyBytes: number,
): Promise<ResultType<Uint8Array, ReadRequestBodyError>> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && /^\d+$/.test(contentLength)) {
    const declaredLength = Number(contentLength);
    if (Number.isSafeInteger(declaredLength) && declaredLength > maxBodyBytes) {
      return Result.err(new WebhookBodyTooLarge(maxBodyBytes));
    }
  }

  const bodyStream = request.body;
  if (bodyStream === null) {
    return Result.ok(new Uint8Array());
  }

  const readerResult = Result.try({
    try: () => bodyStream.getReader(),
    catch: (cause) => new WebhookBodyUnavailable({ cause }),
  });
  if (readerResult.isErr()) {
    return readerResult;
  }
  const reader = readerResult.value;

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const readResult = await Result.tryPromise({
        try: () => reader.read(),
        catch: (cause) => new WebhookBodyUnavailable({ cause }),
      });
      if (readResult.isErr()) {
        return readResult;
      }

      const { done, value } = readResult.value;
      if (done) {
        break;
      }

      totalBytes += value.byteLength;
      if (totalBytes > maxBodyBytes) {
        // The size error is authoritative, so deliberately discard any
        // cancellation failure after asking the stream to stop producing data.
        await Result.tryPromise(() => reader.cancel());
        return Result.err(new WebhookBodyTooLarge(maxBodyBytes));
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return Result.ok(body);
}

export function parseJsonBody(
  body: Uint8Array,
): ResultType<unknown, InvalidWebhookJson> {
  return Result.try({
    try: () => {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(body);
      return JSON.parse(text) as unknown;
    },
    catch: (cause) => new InvalidWebhookJson({ cause }),
  });
}
