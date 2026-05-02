export class FallbackManager {
  constructor({ primary, secondary }) {
    this.primary = primary;
    this.secondary = secondary;
  }

  async execute(event) {
    try {
      return await this.primary.process(event);
    } catch (err) {
      console.warn("Primary AI failed, switching to fallback:", err.message);
      return this.secondary.process(event);
    }
  }
}
