CREATE TABLE IF NOT EXISTS schema_migrations (
  id VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS identity_users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  username VARCHAR(20) NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_identity_users_username UNIQUE (username)
);

CREATE INDEX IF NOT EXISTS idx_identity_users_email ON identity_users (email);
CREATE INDEX IF NOT EXISTS idx_identity_users_phone ON identity_users (phone);
