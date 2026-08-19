import {
  InvalidWebhookContentType,
  InvalidWebhookMethod,
  InvalidWebhookPayload,
  InvalidWebhookTimestamp,
  MissingWebhookHeader,
} from "./errors.js";
import { parseJsonBody, readRequestBody } from "./internal/body.js";
import { verifySignature } from "./internal/signature.js";
import {
  originWebhookEventTypes,
  type OriginWebhook,
  type OriginWebhookEventType,
  type OriginWebhookPayloadMap,
  type WebhookOptions,
} from "./types.js";

const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
const DEFAULT_TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;
const eventTypes = new Set<string>(originWebhookEventTypes);

function requiredHeader(headers: Headers, name: string): string {
  const value = headers.get(name);
  if (value === null || value.length === 0) {
    throw new MissingWebhookHeader(name);
  }
  return value;
}

function validateTimestamp(value: string, toleranceSeconds: number): void {
  if (!/^\d+$/.test(value)) {
    throw new InvalidWebhookTimestamp();
  }

  const timestamp = Number(value);
  if (!Number.isSafeInteger(timestamp)) {
    throw new InvalidWebhookTimestamp();
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    throw new InvalidWebhookTimestamp();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function knownEventType(value: string): value is OriginWebhookEventType {
  return eventTypes.has(value);
}

function hasRecordFields(
  value: Record<string, unknown>,
  fields: readonly string[],
): boolean {
  return fields.every((field) => isRecord(value[field]));
}

function validEventPayload(
  type: OriginWebhookEventType,
  payload: Record<string, unknown>,
): boolean {
  switch (type) {
    case "repository.pushed":
      return (
        hasRecordFields(payload, ["repository", "pusher"]) &&
        Array.isArray(payload.refUpdates) &&
        nonEmptyString(payload.pushedAt) &&
        Number.isSafeInteger(payload.refUpdatesCount) &&
        Number(payload.refUpdatesCount) >= 0
      );

    case "pull_request.created":
    case "pull_request.head_ref.pushed":
    case "pull_request.base_ref.updated":
    case "pull_request.metadata.updated":
    case "pull_request.closed":
    case "pull_request.merged":
    case "pull_request.reopened":
    case "pull_request.published":
      return hasRecordFields(payload, ["pullRequest", "repository"]);

    case "pull_request.comment.created":
      return hasRecordFields(payload, ["pullRequest", "comment"]);

    case "pull_request.review.submitted":
      return hasRecordFields(payload, ["pullRequest", "review"]);

    case "pull_request.reviewer.added":
    case "pull_request.reviewer.removed":
    case "pull_request.reviewer.rerequested":
      return (
        hasRecordFields(payload, ["pullRequest", "reviewer"]) &&
        (payload.createdVia === "CREATED_VIA_UNSPECIFIED" ||
          payload.createdVia === "manual" ||
          payload.createdVia === "codeowners") &&
        nonEmptyString(payload.createdAt) &&
        (payload.createdBy === undefined || isRecord(payload.createdBy))
      );

    case "repository.check_run.created":
    case "repository.check_run.completed":
      return hasRecordFields(payload, ["repository", "checkSuite", "checkRun", "actor"]);

    case "installation.created":
    case "installation.updated":
    case "installation.deleted":
      return hasRecordFields(payload, ["installation", "app"]);
  }
}

function parsePayload(value: unknown, webhookId: string): OriginWebhook {
  if (!isRecord(value)) {
    throw new InvalidWebhookPayload();
  }

  if (!nonEmptyString(value.deliveryId) || value.deliveryId !== webhookId) {
    throw new InvalidWebhookPayload(
      "The authenticated Origin webhook deliveryId does not match webhook-id.",
    );
  }
  if (!nonEmptyString(value.appId) || !nonEmptyString(value.installationId)) {
    throw new InvalidWebhookPayload();
  }
  if (!isRecord(value.event)) {
    throw new InvalidWebhookPayload();
  }

  const event = value.event;
  if (
    !nonEmptyString(event.id) ||
    !nonEmptyString(event.type) ||
    !knownEventType(event.type) ||
    !nonEmptyString(event.eventTime) ||
    !isRecord(event.payload)
  ) {
    throw new InvalidWebhookPayload();
  }

  if (!validEventPayload(event.type, event.payload)) {
    throw new InvalidWebhookPayload(
      `The authenticated ${event.type} payload is missing required fields.`,
    );
  }

  const payload = event.payload as OriginWebhookPayloadMap[typeof event.type];
  return {
    ...value,
    deliveryId: value.deliveryId,
    appId: value.appId,
    installationId: value.installationId,
    event: {
      ...event,
      id: event.id,
      type: event.type,
      eventTime: event.eventTime,
      payload,
    },
  } as OriginWebhook;
}

function positiveInteger(value: number | undefined, fallback: number, name: string): number {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result <= 0) {
    throw new RangeError(`${name} must be a positive integer.`);
  }
  return result;
}

function nonNegativeInteger(value: number | undefined, fallback: number, name: string): number {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new RangeError(`${name} must be a non-negative integer.`);
  }
  return result;
}

export async function verifyWebhook(
  request: Request,
  opts: WebhookOptions = {},
): Promise<OriginWebhook> {
  if (request.method !== "POST") {
    throw new InvalidWebhookMethod(request.method);
  }

  const contentType = request.headers.get("content-type");
  if (contentType === null || contentType.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") {
    throw new InvalidWebhookContentType(contentType);
  }

  const webhookId = requiredHeader(request.headers, "webhook-id");
  const timestampHeader = requiredHeader(request.headers, "webhook-timestamp");
  const signature = requiredHeader(request.headers, "webhook-signature");

  const maxBodyBytes = positiveInteger(
    opts.maxBodyBytes,
    DEFAULT_MAX_BODY_BYTES,
    "maxBodyBytes",
  );
  const toleranceSeconds = nonNegativeInteger(
    opts.timestampToleranceSeconds,
    DEFAULT_TIMESTAMP_TOLERANCE_SECONDS,
    "timestampToleranceSeconds",
  );
  validateTimestamp(timestampHeader, toleranceSeconds);
  const body = await readRequestBody(request, maxBodyBytes);

  await verifySignature(webhookId, timestampHeader, signature, body);
  return parsePayload(parseJsonBody(body), webhookId);
}
