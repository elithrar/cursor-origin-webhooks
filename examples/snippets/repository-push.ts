import { verifyWebhook } from "cursor-origin-webhooks";

export async function handleRepositoryPush(request: Request): Promise<Response> {
  const webhook = await verifyWebhook(request);

  if (webhook.event.type === "repository.pushed") {
    console.log({
      event: webhook.event.type,
      deliveryId: webhook.deliveryId,
      refUpdates: webhook.event.payload.refUpdates,
    });
  }

  return new Response(null, { status: 204 });
}
