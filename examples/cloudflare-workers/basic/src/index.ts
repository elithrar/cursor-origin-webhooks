import {
  InvalidWebhookMethod,
  WebhookVerificationError,
  verifyWebhook,
} from "cursor-origin-webhooks";

export default {
  async fetch(request) {
    try {
      const webhook = await verifyWebhook(request);

      console.log({
        message: "cursor_origin_webhook",
        deliveryId: webhook.deliveryId,
        eventId: webhook.event.id,
        eventType: webhook.event.type,
        webhook,
      });

      return new Response(null, { status: 204 });
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        const headers = new Headers();
        if (error instanceof InvalidWebhookMethod) {
          headers.set("allow", "POST");
        }

        return Response.json(
          { error: error.code },
          {
            status: error.statusCode,
            headers,
          },
        );
      }

      console.error({
        message: "cursor_origin_webhook_unexpected_error",
        error,
      });
      return Response.json(
        { error: "internal_error" },
        { status: 500 },
      );
    }
  },
} satisfies ExportedHandler<Env>;
