// simple in-memory repo (replace with Mongo/Postgres in prod)
export class MemoryRepo {
  constructor() {
    this.data = [];
    this.scores = [];
  }

  async insert(entry) {
    this.data.push(entry);
  }

  async findByUser(user, limit = 20) {
    return this.data.filter(d => d.user === user).slice(-limit);
  }

  async insertScore(score) {
    this.scores.push(score);
  }

  async getTopScores(limit = 10) {
    return this.scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
