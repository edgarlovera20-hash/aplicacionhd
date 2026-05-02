export class AnthropicAgent {
  async process(event) {
    // fallback simple (simulación)
    console.log("[Anthropic Fallback] handling event", event.type);

    return {
      action: "sendMessage",
      target: "whatsapp",
      payload: {
        to: event.user || "unknown",
        message: "Estamos procesando tu solicitud, en breve te contactamos."
      }
    };
  }
}
