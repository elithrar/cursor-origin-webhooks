import {
  InvalidWebhookSignature,
  WebhookVerificationError,
  verifyWebhook,
} from "cursor-origin-webhooks";

export async function handleWebhook(request: Request): Promise<Response> {
  try {
    const webhook = await verifyWebhook(request);
    console.log({ event: webhook.event.type, deliveryId: webhook.deliveryId });
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof InvalidWebhookSignature) {
      return Response.json({ error: error.code }, { status: 401 });
    }

    if (error instanceof WebhookVerificationError) {
      return Response.json({ error: error.code }, { status: error.statusCode });
    }

    throw error;
  }
}
