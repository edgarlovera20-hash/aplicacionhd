import OpenAI from "openai";

export class AIOrchestrator {
  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async process(event) {
    const completion = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `You are an AI decision engine inside a CRM system. Return ONLY JSON: {"action":"...","target":"...","payload":{}}`
        },
        {
          role: "user",
          content: JSON.stringify(event)
        }
      ]
    });

    return JSON.parse(completion.choices[0].message.content);
  }
}
