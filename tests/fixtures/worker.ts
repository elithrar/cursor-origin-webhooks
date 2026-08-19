import {
  WebhookVerificationError,
  verifyWebhook,
} from "../../src/index.js";

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const webhook = await verifyWebhook(request);
      return Response.json({
        deliveryId: webhook.deliveryId,
        eventType: webhook.event.type,
      });
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
