CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  world_id UUID NOT NULL REFERENCES worlds (id),
  display_name VARCHAR(16) NOT NULL,
  display_name_normalized VARCHAR(16) NOT NULL,
  skin_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_characters_user_display_name UNIQUE (user_id, display_name_normalized)
);

CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters (user_id);
CREATE INDEX IF NOT EXISTS idx_characters_world_id ON characters (world_id);
