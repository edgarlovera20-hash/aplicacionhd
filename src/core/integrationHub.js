export class IntegrationHub {
  constructor({ ai, eventBus }) {
    this.ai = ai;
    this.eventBus = eventBus;
    this.connectors = {};
  }

  register(name, connector) {
    this.connectors[name] = connector;
  }

  start() {
    this.eventBus.on("event", async (event) => {
      try {
        const decision = await this.ai.process(event);
        await this.route(decision);
      } catch (err) {
        console.error("IntegrationHub error:", err.message);
      }
    });
  }

  async route({ target, action, payload }) {
    const connector = this.connectors[target];
    if (!connector) throw new Error("Connector not found");
    return connector[action](payload);
  }
}
