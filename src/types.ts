import type { components } from "./generated/origin-openapi.js";

type Schema<Name extends keyof components["schemas"]> = components["schemas"][Name];
type WithRequired<Shape, Keys extends keyof Shape> =
  Omit<Shape, Keys> & Required<Pick<Shape, Keys>>;

export type RepositoryPushWebhookPayload = WithRequired<
  Schema<"RepositoryPushWebhookPayload">,
  "repository" | "refUpdates" | "pushedAt" | "pusher" | "refUpdatesCount"
>;
export type PullRequestWebhookPayload = WithRequired<
  Schema<"PullRequestWebhookPayload">,
  "pullRequest" | "repository"
>;
export type PullRequestCommentWebhookPayload = WithRequired<
  Schema<"PullRequestCommentWebhookPayload">,
  "pullRequest" | "comment"
>;
export type PullRequestReviewWebhookPayload = WithRequired<
  Schema<"PullRequestReviewWebhookPayload">,
  "pullRequest" | "review"
>;
export type PullRequestReviewerWebhookPayload = WithRequired<
  Schema<"PullRequestReviewerWebhookPayload">,
  "pullRequest" | "reviewer" | "createdVia" | "createdAt"
>;
export type CheckRunWebhookPayload = WithRequired<
  Schema<"CheckRunWebhookPayload">,
  "repository" | "checkSuite" | "checkRun" | "actor"
>;
export type InstallationCreatedWebhookPayload = WithRequired<
  Schema<"InstallationCreatedWebhookPayload">,
  "installation" | "app"
>;
export type InstallationUpdatedWebhookPayload = WithRequired<
  Schema<"InstallationUpdatedWebhookPayload">,
  "installation" | "app"
>;
export type InstallationDeletedWebhookPayload = WithRequired<
  Schema<"InstallationDeletedWebhookPayload">,
  "installation" | "app"
>;

export type OriginActor = Schema<"OriginActor">;
export type OriginRepository = Schema<"Repo">;
export type OriginRepositoryReference = Schema<"RepositoryReference">;
export type OriginPullRequest = Schema<"PullRequest">;
export type OriginPullRequestReference = Schema<"PullRequestReference">;
export type OriginPullRequestComment = Schema<"PullRequestComment">;
export type OriginPullRequestReview = Schema<"PullRequestReview">;
export type OriginRequestedReviewer = Schema<"PullRequestRequestedReviewer">;
export type OriginCheckRun = Schema<"CheckRun">;
export type OriginCheckSuite = Schema<"CheckSuite">;
export type OriginInstallation = Schema<"WebhookInstallation">;
export type OriginApp = Schema<"WebhookApp">;

export const originWebhookEventTypes = [
  "repository.pushed",
  "pull_request.created",
  "pull_request.head_ref.pushed",
  "pull_request.base_ref.updated",
  "pull_request.metadata.updated",
  "pull_request.closed",
  "pull_request.merged",
  "pull_request.reopened",
  "pull_request.published",
  "pull_request.comment.created",
  "pull_request.review.submitted",
  "pull_request.reviewer.added",
  "pull_request.reviewer.removed",
  "pull_request.reviewer.rerequested",
  "repository.check_run.created",
  "repository.check_run.completed",
  "installation.created",
  "installation.updated",
  "installation.deleted",
] as const;

export type OriginWebhookEventType = (typeof originWebhookEventTypes)[number];

export interface OriginWebhookPayloadMap {
  "repository.pushed": RepositoryPushWebhookPayload;
  "pull_request.created": PullRequestWebhookPayload;
  "pull_request.head_ref.pushed": PullRequestWebhookPayload;
  "pull_request.base_ref.updated": PullRequestWebhookPayload;
  "pull_request.metadata.updated": PullRequestWebhookPayload;
  "pull_request.closed": PullRequestWebhookPayload;
  "pull_request.merged": PullRequestWebhookPayload;
  "pull_request.reopened": PullRequestWebhookPayload;
  "pull_request.published": PullRequestWebhookPayload;
  "pull_request.comment.created": PullRequestCommentWebhookPayload;
  "pull_request.review.submitted": PullRequestReviewWebhookPayload;
  "pull_request.reviewer.added": PullRequestReviewerWebhookPayload;
  "pull_request.reviewer.removed": PullRequestReviewerWebhookPayload;
  "pull_request.reviewer.rerequested": PullRequestReviewerWebhookPayload;
  "repository.check_run.created": CheckRunWebhookPayload;
  "repository.check_run.completed": CheckRunWebhookPayload;
  "installation.created": InstallationCreatedWebhookPayload;
  "installation.updated": InstallationUpdatedWebhookPayload;
  "installation.deleted": InstallationDeletedWebhookPayload;
}

export interface OriginWebhookEvent<Type extends OriginWebhookEventType> {
  id: string;
  type: Type;
  eventTime: string;
  payload: OriginWebhookPayloadMap[Type];
}

export interface OriginWebhookEnvelope<Type extends OriginWebhookEventType> {
  deliveryId: string;
  appId: string;
  installationId: string;
  event: OriginWebhookEvent<Type>;
}

export type OriginWebhookByType = {
  [Type in OriginWebhookEventType]: OriginWebhookEnvelope<Type>;
};

export type OriginWebhook = OriginWebhookByType[OriginWebhookEventType];

export interface WebhookOptions {
  /**
   * Maximum number of raw request-body bytes accepted before verification.
   *
   * @default 1048576
   */
  maxBodyBytes?: number;

  /**
   * Maximum absolute difference, in seconds, between the webhook timestamp
   * and the current time.
   *
   * @default 300
   */
  timestampToleranceSeconds?: number;
}
