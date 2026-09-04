CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL,
  server_id UUID NOT NULL REFERENCES servers (id),
  name VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_characters_server_name UNIQUE (server_id, name)
);

CREATE INDEX IF NOT EXISTS idx_characters_account_id ON characters (account_id);
