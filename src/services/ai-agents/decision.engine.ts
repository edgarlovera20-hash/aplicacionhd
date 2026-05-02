export function classifyLead(message: string) {
  const text = message.toLowerCase();

  if (text.includes("precio") || text.includes("costo")) return "interesado";
  if (text.includes("quiero") || text.includes("comprar")) return "caliente";
  if (text.includes("informacion")) return "contacto";

  return "lead";
}

export function leadScore(message: string) {
  let score = 0;

  if (message.includes("precio")) score += 2;
  if (message.includes("cuando")) score += 3;
  if (message.includes("comprar")) score += 5;

  return score;
}
