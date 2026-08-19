// @ts-nocheck
export type paths = Record<string, never>;
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /**
         * @description A persisted check run, as returned by `PostCheckRun`. All fields are
         *      server-owned; the writable shape is `CheckRunInput`.
         */
        CheckRun: {
            /** @description Server-assigned unique ID of the check run. */
            readonly id?: string;
            /** @description Repository the check run belongs to. */
            readonly repository?: components["schemas"]["RepositoryReference"];
            /** @description Suite this check run belongs to. */
            readonly checkSuite?: components["schemas"]["CheckSuiteReference"];
            /** @description Resolved head commit SHA the check run is attached to (lowercase hex). */
            readonly sha?: string;
            /** @description App-chosen idempotency key for the check run. */
            readonly key?: string;
            /** @description Human-facing check-run name. */
            readonly name?: string;
            /**
             * Format: enum
             * @enum {string}
             */
            readonly status?: "CHECK_RUN_LIFECYCLE_STATUS_UNSPECIFIED" | "queued" | "in_progress" | "completed";
            /**
             * Format: enum
             * @description Present iff `status == completed`.
             * @enum {string}
             */
            readonly conclusion?: "CHECK_RUN_CONCLUSION_UNSPECIFIED" | "success" | "failure" | "neutral" | "cancelled" | "skipped" | "timed_out" | "action_required" | "stale";
            /** @description Link to more detail about this specific check run, if set. */
            readonly detailsUrl?: string;
            /**
             * Format: date-time
             * @description The external system's last-update time used for ordering.
             */
            readonly externalUpdatedAt?: string;
            /**
             * Format: date-time
             * @description When the check run started, if reported.
             */
            readonly startedAt?: string;
            /**
             * Format: date-time
             * @description When the check run completed, if reported.
             */
            readonly completedAt?: string;
            /** Format: date-time */
            readonly createdAt?: string;
            /** Format: date-time */
            readonly updatedAt?: string;
            /** @description Provider-assigned immutable identity for this check attempt. */
            readonly externalId?: string;
            /** @description Principal that produced the check run. */
            readonly actor?: components["schemas"]["OriginActor"];
            /** @description Human-readable output for this check run, if set. */
            readonly output?: components["schemas"]["CheckRunOutput"];
        };
        /** @description Human-readable output reported for a check run. */
        CheckRunOutput: {
            /** @description Short headline for the output. Maximum length: 255 characters. */
            title?: string;
            /**
             * @description Summary of the output. May contain Markdown.
             *      Maximum UTF-8 size: 65535 bytes.
             */
            summary?: string;
            /**
             * @description Detailed output. May contain Markdown.
             *      Maximum UTF-8 size: 65535 bytes.
             */
            text?: string;
        };
        /** @description Committed snapshot for an Origin check-run lifecycle event. */
        CheckRunWebhookPayload: {
            repository?: components["schemas"]["RepositoryReference"];
            checkSuite?: components["schemas"]["CheckSuite"];
            checkRun?: components["schemas"]["CheckRun"];
            actor?: components["schemas"]["OriginActor"];
        };
        /**
         * @description A persisted check suite, as returned by `PostCheckRun`. All fields are
         *      server-owned; the writable shape is `CheckSuiteInput`.
         */
        CheckSuite: {
            /** @description Server-assigned unique ID of the suite. */
            readonly id?: string;
            /** @description Repository the suite belongs to. */
            readonly repository?: components["schemas"]["RepositoryReference"];
            /** @description Resolved head commit SHA the suite is attached to (lowercase hex). */
            readonly sha?: string;
            /** @description App-chosen idempotency key for the suite. */
            readonly key?: string;
            /** @description Human-facing suite name. */
            readonly name?: string;
            /** @description Link to more detail about the suite as a whole, if set. */
            readonly detailsUrl?: string;
            /** Format: date-time */
            readonly createdAt?: string;
            /** Format: date-time */
            readonly updatedAt?: string;
            /** @description Provider-assigned immutable identity for this suite attempt. */
            readonly externalId?: string;
            /** @description Principal that produced the suite. */
            readonly actor?: components["schemas"]["OriginActor"];
        };
        CheckSuiteReference: {
            id?: string;
        };
        /**
         * @description Git identity and timestamp for a commit's author or committer.
         *
         *      This is the identity recorded in the commit object, not a linked user
         *      account.
         */
        CommitAuthor: {
            name?: string;
            email?: string;
            /**
             * @description ISO-8601 timestamp preserving the git signature's original timezone offset
             *      (e.g. "2014-11-07T22:01:45+01:00").
             */
            date?: string;
        };
        /** @description Payload for an installation.created webhook. */
        InstallationCreatedWebhookPayload: {
            installation?: components["schemas"]["WebhookInstallation"];
            app?: components["schemas"]["WebhookApp"];
        };
        /** @description Payload for an installation.deleted webhook. */
        InstallationDeletedWebhookPayload: {
            installation?: components["schemas"]["WebhookInstallation"];
            app?: components["schemas"]["WebhookApp"];
        };
        /** @description Payload for an installation.updated webhook. */
        InstallationUpdatedWebhookPayload: {
            installation?: components["schemas"]["WebhookInstallation"];
            app?: components["schemas"]["WebhookApp"];
        };
        /** @description A user, app, or service account that performed an externally visible action. */
        OriginActor: {
            user?: components["schemas"]["OriginUserActor"];
            app?: components["schemas"]["OriginAppActor"];
            serviceAccount?: components["schemas"]["OriginServiceAccountActor"];
        };
        OriginAppActor: {
            id?: string;
            slug: string;
        };
        OriginServiceAccountActor: {
            id?: string;
        };
        OriginUserActor: {
            id?: string;
            email: string;
        };
        /** @description The owner of a repo. */
        Owner: {
            /** @description Unique URL-friendly name of the owner. */
            slug?: string;
            /** @description Unique ID of the owner entity. */
            id?: string;
        };
        /** @description A pull request. */
        PullRequest: {
            /** @description Stable Origin change identifier. */
            id?: string;
            /** @description Change number within its repository. */
            number?: string;
            /** @description "open" or "closed". A draft is "open"; merged and closed changes are both "closed". */
            state?: string;
            /** @description Whether the change is still a draft. */
            draft?: boolean;
            /** @description Whether the change has been merged. */
            merged?: boolean;
            /** @description Change title. */
            title?: string;
            /** @description Change description. */
            body?: string;
            /** @description The source side of the change - what is being merged in. */
            head?: components["schemas"]["PullRequestRef"];
            /** @description The target side of the change — what it merges into. */
            base?: components["schemas"]["PullRequestRef"];
            /** @description The principal that opened the change. */
            author?: components["schemas"]["OriginActor"];
            /**
             * Format: date-time
             * @description When the change was opened.
             */
            createdAt?: string;
            /**
             * Format: date-time
             * @description When the change was last updated.
             */
            updatedAt?: string;
            /**
             * Format: date-time
             * @description When the change was closed or merged; unset while open.
             */
            closedAt?: string;
            /**
             * Format: date-time
             * @description When the change was merged; unset unless merged.
             */
            mergedAt?: string;
            /** @description SHA of the resulting merge commit; set once merged. */
            mergeCommitSha?: string;
            /**
             * Format: int32
             * @description Lines added by the change's latest version.
             */
            additions?: number;
            /**
             * Format: int32
             * @description Lines deleted by the change's latest version.
             */
            deletions?: number;
            /**
             * Format: int32
             * @description Files changed by the change's latest version.
             */
            changedFiles?: number;
            /** @description The change's latest version. */
            version?: components["schemas"]["PullRequestVersion"];
        };
        /** @description A threaded comment on a pull request. */
        PullRequestComment: {
            id?: string;
            thread?: components["schemas"]["ThreadReference"];
            body?: string;
            author?: components["schemas"]["OriginActor"];
            /** Format: date-time */
            createdAt?: string;
            /** Format: date-time */
            updatedAt?: string;
        };
        PullRequestCommentWebhookPayload: {
            pullRequest?: components["schemas"]["PullRequestReference"];
            comment?: components["schemas"]["PullRequestComment"];
        };
        /** @description One side (head or base) of a change. */
        PullRequestRef: {
            /** @description The ref this side points at, as Origin records it. */
            ref?: string;
            /** @description Tip commit SHA of this side at the change's latest version. */
            sha?: string;
        };
        /** @description Stable identity and display coordinates for an Origin pull request. */
        PullRequestReference: {
            /** @description Immutable Origin change id. */
            id?: string;
            number?: string;
            /** @description Repository reference for this pull request. */
            repository?: components["schemas"]["RepositoryReference"];
        };
        PullRequestRequestedReviewer: {
            /**
             * Format: enum
             * @enum {string}
             */
            kind?: "KIND_UNSPECIFIED" | "user" | "group";
            /**
             * @description Stable external reviewer id: the encoded user id (`user_…`, same format
             *      as the organization API) when kind=user; the group public id (`grp_…`)
             *      when kind=group. Historic deliveries carried the user's provider-scoped
             *      auth id instead of the encoded id.
             */
            id?: string;
        };
        /** @description A pull request review. */
        PullRequestReview: {
            /** @description Stable Origin review identifier. */
            id?: string;
            /** @description The principal that authored the review. */
            author?: components["schemas"]["OriginActor"];
            /**
             * Format: enum
             * @enum {string}
             */
            verdict?: "PULL_REQUEST_REVIEW_VERDICT_UNSPECIFIED" | "approve" | "request_changes" | "comment";
            /** @description Free-text review summary. Empty when the reviewer left no summary. */
            body?: string;
            /**
             * Format: date-time
             * @description When the review was submitted. Unset for an unsubmitted draft review.
             */
            submittedAt?: string;
            /** @description The pull request version and head SHA the verdict applies to. */
            pullRequestVersion?: components["schemas"]["PullRequestVersion"];
            /**
             * @description Set once the review has been dismissed; absent while the verdict still
             *      counts toward the pull request's review state.
             */
            dismissal?: components["schemas"]["PullRequestReviewDismissal"];
        };
        /**
         * @description Records that a submitted review no longer counts toward the pull request's
         *      review state.
         */
        PullRequestReviewDismissal: {
            /**
             * @description The principal that dismissed the review. Absent when the dismissal was
             *      recorded under an actor kind this API does not expose.
             */
            dismissedBy?: components["schemas"]["OriginActor"];
            /**
             * Format: date-time
             * @description When the review was dismissed.
             */
            dismissedAt?: string;
            /**
             * @description Reason recorded with the dismissal. Reviews retired automatically because
             *      their author submitted a newer verdict carry a server-generated reason.
             */
            message?: string;
        };
        /** @description pull_request.review.submitted webhook payload. */
        PullRequestReviewWebhookPayload: {
            pullRequest?: components["schemas"]["PullRequestReference"];
            review?: components["schemas"]["PullRequestReview"];
        };
        /** @description pull_request.reviewer.{added,removed,rerequested} webhook payload. */
        PullRequestReviewerWebhookPayload: {
            pullRequest?: components["schemas"]["PullRequestReference"];
            reviewer?: components["schemas"]["PullRequestRequestedReviewer"];
            /**
             * Format: enum
             * @enum {string}
             */
            createdVia?: "CREATED_VIA_UNSPECIFIED" | "manual" | "codeowners";
            createdBy?: components["schemas"]["OriginActor"];
            /** Format: date-time */
            createdAt?: string;
        };
        /**
         * @description A numbered revision of a change. Each push produces a new version with its
         *      own head/base SHAs and diff stats.
         */
        PullRequestVersion: {
            /** @description Monotonic version number within the change (1-based). */
            number?: string;
            /** @description Head commit SHA for this version. */
            headSha?: string;
            /** @description Base commit SHA this version is diffed against. */
            baseSha?: string;
            /**
             * Format: date-time
             * @description When this version was created.
             */
            createdAt?: string;
        };
        /** @description Payload for a pull request lifecycle event. */
        PullRequestWebhookPayload: {
            /** @description The pull request itself. */
            pullRequest?: components["schemas"]["PullRequest"];
            /** @description The repository the pull request belongs to. */
            repository?: components["schemas"]["RepositoryReference"];
        };
        /** @description A repository. */
        Repo: {
            readonly id?: string;
            /** @description The repo name, unique to its owner. Required on create. */
            name: string;
            /** @description "{owner.login}/{name}". Derived. */
            readonly fullName?: string;
            /** @description The owning entity. Determined by the parent on create; not settable directly. */
            readonly owner?: components["schemas"]["Owner"];
            /** @description Default branch name. Always set on responses. On create, omitting this field or leaving it empty defaults to "main". */
            defaultBranch?: string;
            /** Format: date-time */
            readonly createdAt?: string;
            /** Format: date-time */
            readonly updatedAt?: string;
            /**
             * Format: date-time
             * @description Most-recent-push timestamp on any branch; absent until the first push.
             */
            readonly pushedAt?: string;
            /** @description HTTPS URL for cloning the repository. */
            readonly cloneUrl?: string;
            /**
             * @description Mirror metadata. Absent for a native repository and before a mirror's
             *      initial sync is ready.
             */
            readonly mirror?: components["schemas"]["RepositoryMirror"];
        };
        /** @description The external source and lifecycle state of a mirrored repository. */
        RepositoryMirror: {
            /**
             * Format: enum
             * @enum {string}
             */
            readonly source?: "SOURCE_UNSPECIFIED" | "github";
            /** @description Opaque repository identifier assigned by the source. */
            readonly sourceId?: string;
            /**
             * Format: enum
             * @description Effective direction during a transition, until cutover completes.
             * @enum {string}
             */
            readonly status?: "STATUS_UNSPECIFIED" | "inbound" | "outbound";
        };
        /**
         * @description Commit at the peeled tip of a pushed ref. The SHA may differ from the ref's
         *      `after` value when an annotated tag points to the commit.
         */
        RepositoryPushCommit: {
            sha?: string;
            author?: components["schemas"]["CommitAuthor"];
            committer?: components["schemas"]["CommitAuthor"];
            message?: string;
        };
        /** @description One ref update within an atomic repository push. */
        RepositoryPushRefUpdate: {
            /**
             * @description The full git ref that was pushed.
             *      Example: `refs/heads/main` or `refs/tags/v3.14.1`.
             */
            ref?: string;
            /**
             * @description The SHA of the most recent commit on `ref` before the push. All-zero
             *      (`0000000000000000000000000000000000000000`) when the ref was just created.
             */
            before?: string;
            /**
             * @description The SHA of the most recent commit on `ref` after the push. All-zero
             *      (`0000000000000000000000000000000000000000`) when the ref was deleted.
             */
            after?: string;
            /** @description Whether this push created the ref. */
            created?: boolean;
            /** @description Whether this push deleted the ref. */
            deleted?: boolean;
            /**
             * @description Whether this push rewrote history: a non-fast-forward update of an existing
             *      ref (the new tip is not a descendant of the old tip). False for ref
             *      creates, deletes, fast-forward updates, and pushes observed before Origin
             *      tracked force-push status.
             */
            forced?: boolean;
            /**
             * @description Best-effort metadata for the commit at the peeled new tip. Unset for
             *      deletions, non-commit refs, historical pushes, and extraction failures.
             */
            headCommit?: components["schemas"]["RepositoryPushCommit"];
        };
        /** @description Payload for one atomic push, which may update several refs. */
        RepositoryPushWebhookPayload: {
            /** @description The repository the push targeted. */
            repository?: components["schemas"]["RepositoryReference"];
            /** @description Refs included from this push. */
            refUpdates?: components["schemas"]["RepositoryPushRefUpdate"][];
            /**
             * Format: date-time
             * @description When Origin observed the push.
             */
            pushedAt?: string;
            /** @description The principal that performed the push, as verified by Origin. */
            pusher?: components["schemas"]["OriginActor"];
            /**
             * Format: uint32
             * @description Number of ref updates in the atomic push. ref_updates may be shorter when
             *      the producer capped the list.
             */
            refUpdatesCount?: number;
        };
        /** @description Stable identity and display coordinates for a repository. */
        RepositoryReference: {
            id?: string;
            name?: string;
            owner?: components["schemas"]["Owner"];
        };
        /** @description Stable identity for a pull request comment thread. */
        ThreadReference: {
            id?: string;
        };
        WebhookApp: {
            id?: string;
            slug?: string;
        };
        WebhookInstallation: {
            id?: string;
            target?: components["schemas"]["Owner"];
            /**
             * Format: enum
             * @enum {string}
             */
            repoSelectionMode?: "APP_INSTALLATION_REPO_SELECTION_MODE_UNSPECIFIED" | "all" | "selected";
            /** @description Empty when repository_selection is "all". Capped; see repositories_count for the true total. */
            repositories?: components["schemas"]["RepositoryReference"][];
            scopes?: string[];
            /**
             * Format: int32
             * @description True total; 0 when repository_selection is "all".
             */
            repositoriesCount?: number;
            /** Format: date-time */
            createdAt?: string;
            /** Format: date-time */
            deletedAt?: string;
            /**
             * Format: date-time
             * @description Set while the installation is suspended; unset when it is active.
             */
            suspendedAt?: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
