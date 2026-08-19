# cursor-origin-webhooks

`cursor-origin-webhooks` verifies Cursor Origin webhook requests and returns a
typed event payload. It uses Web Crypto, has no runtime dependencies, and works
in Cloudflare Workers, Deno, Bun, and Node.js.

The library handles the details that are easy to get wrong:

- verifies the signature against Cursor's active Origin signing keys;
- signs the exact raw request bytes before parsing JSON;
- enforces the five-minute timestamp window;
- caches imported JWKS keys inside each runtime isolate or process;
- refreshes the cache for signing-key rotation;
- rejects oversized or malformed requests with typed errors; and
- maps every documented Origin event to its OpenAPI payload type.

## Install

```sh
npm install cursor-origin-webhooks
```

## Use it

Pass the incoming `Request` to `verifyWebhook`. It returns only after the
request has been authenticated and its delivery envelope has been validated.

```ts
import {
  WebhookVerificationError,
  verifyWebhook,
} from "cursor-origin-webhooks";

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const webhook = await verifyWebhook(request);

      switch (webhook.event.type) {
        case "repository.pushed":
          console.log(webhook.event.payload.refUpdates);
          break;
        case "pull_request.created":
          console.log(webhook.event.payload.pullRequest);
          break;
      }

      return new Response(null, { status: 204 });
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        return Response.json(
          { error: error.code },
          { status: error.statusCode },
        );
      }
      throw error;
    }
  },
};
```

Cursor retries transport failures, `429`, and `5xx` responses. Return a `2xx`
quickly after durable acceptance if your handler hands work to a queue or
workflow.

## Deno

Deno can consume the npm package directly:

```ts
import { verifyWebhook } from "npm:cursor-origin-webhooks";

const webhook = await verifyWebhook(request);
```

## Configure an Origin App

1. Open [Cursor's Origin app settings](https://cursor.com/codebase/settings/apps)
   and create an app.
2. Set its webhook URL to your public HTTPS endpoint.
3. Select the events to send, then install the app for the relevant Origin
   repositories.

See Cursor's [Origin webhook documentation](https://cursor.com/docs/api/origin#webhooks)
for the event list and delivery details.

## Options

```ts
await verifyWebhook(request, {
  maxBodyBytes: 1024 * 1024,
  timestampToleranceSeconds: 300,
});
```

| Option | Default | Purpose |
| --- | ---: | --- |
| `maxBodyBytes` | `1048576` | Reject the body before unbounded buffering. |
| `timestampToleranceSeconds` | `300` | Maximum permitted clock difference. |

The JWKS URL, key imports, cache lifetime, and refresh behavior are internal.
Applications do not supply a webhook secret or manage signing keys.

## Errors

All expected failures extend `WebhookVerificationError` and include a stable
`code` and suggested HTTP `statusCode`.

- `InvalidWebhookMethod`
- `InvalidWebhookContentType`
- `MissingWebhookHeader`
- `InvalidWebhookTimestamp`
- `WebhookBodyUnavailable`
- `WebhookBodyTooLarge`
- `WebhookKeyUnavailable`
- `InvalidWebhookSignature`
- `InvalidWebhookJson`
- `InvalidWebhookPayload`

`WebhookKeyUnavailable` uses status `503`, allowing Cursor to retry a delivery
when its public signing keys cannot be refreshed. Authentication and payload
errors use terminal `4xx` responses.

## Signing keys and caching

Cursor publishes Origin's active Ed25519 keys at
[`https://api.cursor.com/v1/origin/keys`](https://api.cursor.com/v1/origin/keys).
The discovery document is available at
[`https://api.cursor.com/v1/origin/.well-known/openid-configuration`](https://api.cursor.com/v1/origin/.well-known/openid-configuration).

The cache is module-scoped. A warm Worker isolate or Deno process reuses the
same imported `CryptoKey` objects. Cold isolates fetch independently. The
library honors the JWKS response's `Cache-Control` directives and performs one
rate-limited refresh after a signature miss to handle key rotation.

Expired keys are not used when a refresh fails.

## Payload types

`OriginWebhook` is a discriminated union keyed by `webhook.event.type`.
`OriginWebhookByType` provides direct lookup when an application already knows
the event:

```ts
import type { OriginWebhookByType } from "cursor-origin-webhooks";

type PushWebhook = OriginWebhookByType["repository.pushed"];
```

The nested payload types are generated from a checked-in snapshot of Cursor's
[Origin OpenAPI specification](https://cursor.com/docs/api/origin). Unknown JSON
fields are retained for forward compatibility, but unknown event names are
rejected until their payload mapping is added to the library.

## Cloudflare Worker example

[`examples/cloudflare-workers/basic`](examples/cloudflare-workers/basic)
contains a deployable Worker that verifies a request and logs the authenticated
payload.

```sh
npm run build
cd examples/cloudflare-workers/basic
npm install
npm run deploy
```

No secret binding is required.

## Development

```sh
npm install
npm run generate:types
npm run typecheck
npm test
npm run test:workers
npm run test:deno
npm run test:coverage
npm run validate:package
npm run validate:example
```

The schema snapshot lives at `schema/origin-openapi.yaml`. Regenerate the
webhook-only type subset after updating that snapshot.

## License

Apache-2.0
