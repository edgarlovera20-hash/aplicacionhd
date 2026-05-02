export class ScoringEngine {
  constructor({ repo }) {
    this.repo = repo;
  }

  async score({ decision, outcome }) {
    let score = 0;

    if (outcome === "success") score += 1;
    if (outcome === "fail") score -= 1;

    await this.repo.insertScore({ decision, score, ts: Date.now() });

    return score;
  }

  async getBestActions(limit = 10) {
    return this.repo.getTopScores(limit);
  }
}
