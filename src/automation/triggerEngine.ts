/**
 * Trigger Engine — subscribes to Redis events, matches automation rules, enqueues actions.
 */

import type { Pool } from 'pg';
import type { AppEvent } from '../infra/eventBus.js';
import { automationQueue } from '../infra/queues.js';

interface AutomationRule {
  id: string;
  name: string;
  trigger_type: string;
  conditions: Array<{ field: string; operator: string; value: unknown }>;
  actions: Array<{ type: string; params?: Record<string, unknown> }>;
}

let _pool: Pool | null = null;
let _rules: AutomationRule[] = [];
let _pollInterval: ReturnType<typeof setInterval> | null = null;

export function injectPool(pool: Pool): void {
  _pool = pool;
}

/** Reload rules from DB every 60 seconds and at init. */
export async function loadRules(): Promise<void> {
  if (!_pool) return;
  try {
    const r = await _pool.query<AutomationRule>(
      `SELECT id, name, trigger_type, conditions, actions FROM automations WHERE enabled = TRUE`
    );
    _rules = r.rows;
  } catch (err) {
    console.warn('[TriggerEngine] No se pudieron cargar reglas:', (err as Error).message);
  }
}

export function startPolling(): void {
  loadRules();
  _pollInterval = setInterval(loadRules, 60_000);
}

export function stopPolling(): void {
  if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null; }
}

/** Evaluate a single condition against event payload. */
function matchCondition(cond: AutomationRule['conditions'][number], payload: Record<string, unknown>): boolean {
  const actual = payload[cond.field];
  switch (cond.operator) {
    case 'eq':      return actual === cond.value;
    case 'neq':     return actual !== cond.value;
    case 'contains': return typeof actual === 'string' && actual.includes(String(cond.value));
    case 'gt':      return typeof actual === 'number' && actual > Number(cond.value);
    case 'lt':      return typeof actual === 'number' && actual < Number(cond.value);
    default:        return false;
  }
}

/** Main: called from eventBus.subscribe() in server.ts */
export async function handleEvent(event: AppEvent): Promise<void> {
  const matching = _rules.filter((rule) => {
    if (rule.trigger_type !== event.type) return false;
    const payload = event.payload as Record<string, unknown>;
    return rule.conditions.every((c) => matchCondition(c, payload));
  });

  for (const rule of matching) {
    try {
      await automationQueue.add('execute', {
        automationId: rule.id,
        automationName: rule.name,
        actions: rule.actions,
        eventType: event.type,
        eventPayload: event.payload,
      });
    } catch (err) {
      console.warn(`[TriggerEngine] No se pudo encolar automatización ${rule.id}:`, (err as Error).message);
    }
  }
}
