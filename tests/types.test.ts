import { describe, expectTypeOf, it } from "vitest";
import type {
  OriginWebhook,
  OriginWebhookByType,
  PullRequestCommentWebhookPayload,
  RepositoryPushWebhookPayload,
} from "../src/index.js";

describe("public webhook types", () => {
  it("maps event names to their payload families", () => {
    expectTypeOf<
      OriginWebhookByType["repository.pushed"]["event"]["payload"]
    >().toEqualTypeOf<RepositoryPushWebhookPayload>();
    expectTypeOf<
      OriginWebhookByType["pull_request.comment.created"]["event"]["payload"]
    >().toEqualTypeOf<PullRequestCommentWebhookPayload>();
  });

  it("narrows the payload from event.type", () => {
    function payload(webhook: OriginWebhook) {
      if (webhook.event.type === "repository.pushed") {
        expectTypeOf(webhook.event.payload).toEqualTypeOf<RepositoryPushWebhookPayload>();
      }
    }

    expectTypeOf(payload).toBeFunction();
  });
});
