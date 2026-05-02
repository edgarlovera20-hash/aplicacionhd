import { FallbackManager } from "./fallbackManager.js";

export class AIRouter {
  constructor({ openaiAgent, geminiAgent, anthropicAgent }) {
    this.recruitmentAI = new FallbackManager({
      primary: openaiAgent,
      secondary: anthropicAgent
    });

    this.operationsAI = new FallbackManager({
      primary: geminiAgent,
      secondary: anthropicAgent
    });
  }

  async route(event) {
    switch (event.type) {
      case "candidate.message":
      case "recruitment.screening":
        return this.recruitmentAI.execute(event);

      case "system.task":
      case "crm.update":
      case "automation":
        return this.operationsAI.execute(event);

      default:
        throw new Error("No AI route defined");
    }
  }
}
