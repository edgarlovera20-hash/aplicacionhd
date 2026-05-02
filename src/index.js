import { eventBus } from "./core/eventBus.js";
import { AIOrchestrator } from "./core/aiOrchestrator.js";
import { IntegrationHub } from "./core/integrationHub.js";

class WhatsAppConnector {
  async sendMessage({ to, message }) {
    console.log("[WhatsApp]", to, message);
  }
}

const ai = new AIOrchestrator();

const hub = new IntegrationHub({ ai, eventBus });

hub.register("whatsapp", new WhatsAppConnector());

hub.start();

eventBus.emit("event", {
  type: "message.received",
  channel: "whatsapp",
  user: "cliente123",
  message: "Hola quiero info"
});
