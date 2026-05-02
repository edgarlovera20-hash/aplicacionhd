export class AutoOptimizer {
  constructor({ scoringEngine }) {
    this.scoring = scoringEngine;
  }

  async optimize(decision) {
    const best = await this.scoring.getTopScores(5);

    // lógica simple: si hay acciones mejores, sugerir ajuste
    if (best.length > 0) {
      return {
        ...decision,
        optimized: true,
        suggestions: best
      };
    }

    return decision;
  }
}
