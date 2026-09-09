CREATE TABLE IF NOT EXISTS character_world_state (
  character_id UUID PRIMARY KEY REFERENCES characters (id) ON DELETE CASCADE,
  map_id VARCHAR(64) NOT NULL DEFAULT 'laboratory',
  x INT NOT NULL,
  y INT NOT NULL,
  z INT NOT NULL DEFAULT 0,
  direction VARCHAR(8) NOT NULL DEFAULT 'DOWN',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_character_direction CHECK (
    direction IN ('UP', 'DOWN', 'LEFT', 'RIGHT')
  )
);
