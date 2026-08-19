export type WebhookErrorCode =
  | "invalid_method"
  | "invalid_content_type"
  | "missing_header"
  | "invalid_timestamp"
  | "body_unavailable"
  | "body_too_large"
  | "key_unavailable"
  | "invalid_signature"
  | "invalid_json"
  | "invalid_payload";

export abstract class WebhookVerificationError extends Error {
  abstract readonly code: WebhookErrorCode;
  abstract readonly statusCode: number;

  protected constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class InvalidWebhookMethod extends WebhookVerificationError {
  readonly code = "invalid_method";
  readonly statusCode = 405;

  constructor(readonly method: string) {
    super(`Origin webhooks must use POST, received ${method || "(empty)"}.`);
  }
}

export class InvalidWebhookContentType extends WebhookVerificationError {
  readonly code = "invalid_content_type";
  readonly statusCode = 415;

  constructor(readonly contentType: string | null) {
    super("Origin webhooks must use the application/json content type.");
  }
}

export class MissingWebhookHeader extends WebhookVerificationError {
  readonly code = "missing_header";
  readonly statusCode = 400;

  constructor(readonly header: string) {
    super(`Missing required Origin webhook header: ${header}.`);
  }
}

export class InvalidWebhookTimestamp extends WebhookVerificationError {
  readonly code = "invalid_timestamp";
  readonly statusCode = 401;

  constructor(message = "The Origin webhook timestamp is invalid or outside the allowed window.") {
    super(message);
  }
}

export class WebhookBodyUnavailable extends WebhookVerificationError {
  readonly code = "body_unavailable";
  readonly statusCode = 400;

  constructor(options?: ErrorOptions) {
    super("The Origin webhook request body could not be read.", options);
  }
}

export class WebhookBodyTooLarge extends WebhookVerificationError {
  readonly code = "body_too_large";
  readonly statusCode = 413;

  constructor(readonly maxBodyBytes: number) {
    super(`The Origin webhook body exceeds the ${maxBodyBytes} byte limit.`);
  }
}

export class WebhookKeyUnavailable extends WebhookVerificationError {
  readonly code = "key_unavailable";
  readonly statusCode = 503;

  constructor(options?: ErrorOptions) {
    super("Cursor's active Origin webhook signing keys are unavailable.", options);
  }
}

export class InvalidWebhookSignature extends WebhookVerificationError {
  readonly code = "invalid_signature";
  readonly statusCode = 401;

  constructor() {
    super("The Origin webhook signature is invalid.");
  }
}

export class InvalidWebhookJson extends WebhookVerificationError {
  readonly code = "invalid_json";
  readonly statusCode = 400;

  constructor(options?: ErrorOptions) {
    super("The authenticated Origin webhook body is not valid JSON.", options);
  }
}

export class InvalidWebhookPayload extends WebhookVerificationError {
  readonly code = "invalid_payload";
  readonly statusCode = 400;

  constructor(message = "The authenticated Origin webhook payload has an invalid shape.") {
    super(message);
  }
}
