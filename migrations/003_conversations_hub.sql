-- Migration 003: Conversations hub — unified messaging schema + leads
-- Run after 001/002 migrations.

-- ── Conversations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel     TEXT NOT NULL CHECK (channel IN ('whatsapp','telegram','facebook','sms','voice')),
  external_id TEXT NOT NULL,           -- phone number or chat_id from channel
  contact_id  UUID REFERENCES clientes_seguimiento(id) ON DELETE SET NULL,
  agent_id    UUID REFERENCES users(uid) ON DELETE SET NULL,
  status      TEXT DEFAULT 'open' CHECK (status IN ('open','assigned','resolved','archived')),
  intent      TEXT,                    -- last classified intent
  sentiment   REAL,                    -- -1.0 to 1.0
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel, external_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_channel_ext ON conversations(channel, external_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_id) WHERE agent_id IS NOT NULL;

-- ── Messages within conversations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conv_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction       TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  content         TEXT NOT NULL,
  media_url       TEXT,
  status          TEXT DEFAULT 'sent' CHECK (status IN ('queued','sent','delivered','read','failed')),
  ai_generated    BOOLEAN DEFAULT FALSE,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_messages_conv ON conv_messages(conversation_id, created_at DESC);

-- ── Leads (with scoring + pipeline stage) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  nombre          TEXT NOT NULL,
  telefono        TEXT,
  email           TEXT,
  canal           TEXT,
  score           INTEGER DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  stage           TEXT DEFAULT 'new' CHECK (stage IN ('new','contacted','qualified','proposal','won','lost')),
  source          TEXT,                -- 'whatsapp_bot','facebook_ad','manual'
  assigned_to     UUID REFERENCES users(uid) ON DELETE SET NULL,
  notes           TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_stage_score ON leads(stage, score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to) WHERE assigned_to IS NOT NULL;

-- ── updated_at auto-update trigger ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
