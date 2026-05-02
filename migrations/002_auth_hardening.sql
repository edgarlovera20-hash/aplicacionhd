-- ─────────────────────────────────────────────────────────────────────────────
-- Migración 002 — Auth hardening: refresh_tokens + invitations
-- ─────────────────────────────────────────────────────────────────────────────

-- ── REFRESH TOKENS ────────────────────────────────────────────────────────────
-- Almacena el SHA-256 del refresh token (nunca el token en claro).
-- La rotación elimina el registro viejo e inserta uno nuevo en cada /auth/refresh.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          SERIAL       PRIMARY KEY,
  user_uid    VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  token_hash  CHAR(64)     NOT NULL UNIQUE,   -- SHA-256 hex
  expires_at  TIMESTAMP    NOT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rt_user_uid   ON refresh_tokens(user_uid);
CREATE INDEX IF NOT EXISTS idx_rt_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_rt_expires_at ON refresh_tokens(expires_at);

-- ── INVITACIONES ──────────────────────────────────────────────────────────────
-- Solo gerente/administracion puede generar invitaciones.
-- El registro público (/api/auth/register) queda bloqueado;
-- únicamente /api/auth/register-with-invite acepta nuevos usuarios.
CREATE TABLE IF NOT EXISTS invitations (
  id              SERIAL       PRIMARY KEY,
  token           CHAR(64)     NOT NULL UNIQUE,
  email           VARCHAR(255) NOT NULL,
  role            VARCHAR(50)  NOT NULL,
  nombres         VARCHAR(255),
  created_by_uid  VARCHAR(255) REFERENCES users(uid) ON DELETE SET NULL,
  expires_at      TIMESTAMP    NOT NULL,
  used            BOOLEAN      DEFAULT FALSE,
  used_at         TIMESTAMP,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inv_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_inv_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_inv_used  ON invitations(used);
