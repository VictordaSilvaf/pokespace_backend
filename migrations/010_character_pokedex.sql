CREATE TABLE IF NOT EXISTS character_pokedex_entries (
  character_id UUID NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
  dex_id INT NOT NULL REFERENCES pokemon (dex_id) ON DELETE CASCADE,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  caught_at TIMESTAMPTZ NULL,
  PRIMARY KEY (character_id, dex_id)
);

CREATE INDEX IF NOT EXISTS idx_character_pokedex_character
  ON character_pokedex_entries (character_id);
