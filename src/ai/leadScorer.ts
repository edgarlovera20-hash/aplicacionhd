/**
 * Lead Scoring — rules-based score from 0 to 100.
 */

export interface ScoringInput {
  hasEmail: boolean;
  messageCount: number;       // number of inbound messages from this contact
  intent: string;
  profileType?: string;       // 'asesor' | 'supervisor' | other
  appointmentScheduled: boolean;
  daysSinceLastMessage: number;
}

export function computeScore(input: ScoringInput): number {
  let score = 0;

  if (input.hasEmail)                        score += 20;
  if (input.messageCount > 2)                score += 20;
  if (input.intent === 'reclutamiento')      score += 30;
  if (input.profileType === 'asesor' || input.profileType === 'supervisor') score += 15;
  if (input.appointmentScheduled)            score += 15;
  if (input.daysSinceLastMessage > 3)        score -= 20;

  return Math.min(100, Math.max(0, score));
}
