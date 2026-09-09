-- Pokédex / OT catalog fields on pokemon
ALTER TABLE pokemon
  ADD COLUMN IF NOT EXISTS look_type INT NULL,
  ADD COLUMN IF NOT EXISTS portrait_id INT NULL,
  ADD COLUMN IF NOT EXISTS experience INT NULL,
  ADD COLUMN IF NOT EXISTS ot_hp INT NULL,
  ADD COLUMN IF NOT EXISTS ot_speed INT NULL,
  ADD COLUMN IF NOT EXISTS has_shiny BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_mega BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source VARCHAR(32) NOT NULL DEFAULT 'ot-catalog';

CREATE INDEX IF NOT EXISTS idx_pokemon_look_type ON pokemon (look_type);
CREATE INDEX IF NOT EXISTS idx_pokemon_types_gin ON pokemon USING GIN (types);

-- Allow longer OT names if needed
ALTER TABLE pokemon ALTER COLUMN name TYPE VARCHAR(64);
