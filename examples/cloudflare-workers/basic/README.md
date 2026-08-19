# Cloudflare Worker example

This Worker verifies Cursor Origin webhook requests, logs the authenticated
payload, and returns `204`.

From the repository root:

```sh
npm run build
cd examples/cloudflare-workers/basic
npm install
npm run dev
```

Deploy it with:

```sh
npm run deploy
```

Set the resulting HTTPS URL as the webhook URL for your Cursor Origin app.
Origin verifies with public signing keys, so the Worker does not need a webhook
secret or other binding.
