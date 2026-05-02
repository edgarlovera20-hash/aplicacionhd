-- Migration 004: Automation rules engine

CREATE TABLE IF NOT EXISTS automations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  trigger_type  TEXT NOT NULL CHECK (trigger_type IN (
                  'message.received','lead.created','payment.failed',
                  'chat.assigned','automation.fired','schedule'
                )),
  conditions    JSONB DEFAULT '[]',  -- [{field, operator, value}]
  actions       JSONB DEFAULT '[]',  -- [{type, params}]
  enabled       BOOLEAN DEFAULT TRUE,
  run_count     INTEGER DEFAULT 0,
  last_run_at   TIMESTAMPTZ,
  created_by    UUID REFERENCES users(uid) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automations_trigger ON automations(trigger_type) WHERE enabled = TRUE;

DO $$ BEGIN
  CREATE TRIGGER trg_automations_updated_at
    BEFORE UPDATE ON automations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed default automations
INSERT INTO automations (name, description, trigger_type, conditions, actions)
VALUES
  (
    'Bienvenida Telegram',
    'Respuesta automática a mensajes nuevos de Telegram',
    'message.received',
    '[{"field": "channel", "operator": "eq", "value": "telegram"}]',
    '[{"type": "send_message", "params": {"template": "bienvenida_telegram"}}]'
  ),
  (
    'Notificar Lead Reclutamiento',
    'Notifica a RECLUTADORA cuando se detecta intención de reclutamiento',
    'lead.created',
    '[{"field": "canal", "operator": "neq", "value": "manual"}]',
    '[{"type": "notify_agent", "params": {"role": "RECLUTADORA"}}]'
  )
ON CONFLICT DO NOTHING;
