CREATE TABLE IF NOT EXISTS pokemon (
  id UUID PRIMARY KEY,
  dex_id INT NOT NULL,
  name VARCHAR(50) NOT NULL,
  types TEXT[] NOT NULL,
  hp INT NOT NULL,
  attack INT NOT NULL,
  defense INT NOT NULL,
  special_attack INT NOT NULL,
  special_defense INT NOT NULL,
  speed INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pokemon_dex_id UNIQUE (dex_id),
  CONSTRAINT uq_pokemon_name UNIQUE (name),
  CONSTRAINT ck_pokemon_status CHECK (status IN ('active', 'disabled')),
  CONSTRAINT ck_pokemon_dex_id CHECK (dex_id >= 1),
  CONSTRAINT ck_pokemon_stats CHECK (
    hp >= 1 AND attack >= 1 AND defense >= 1
    AND special_attack >= 1 AND special_defense >= 1 AND speed >= 1
  )
);

CREATE INDEX IF NOT EXISTS idx_pokemon_status ON pokemon (status);

INSERT INTO pokemon (
  id, dex_id, name, types,
  hp, attack, defense, special_attack, special_defense, speed,
  status, created_at
) VALUES
  (
    'a0000001-0001-4000-8000-000000000001',
    1, 'Bulbasaur', ARRAY['grass', 'poison'],
    45, 49, 49, 65, 65, 45, 'active', '2026-01-01T00:00:00Z'
  ),
  (
    'a0000001-0001-4000-8000-000000000004',
    4, 'Charmander', ARRAY['fire'],
    39, 52, 43, 60, 50, 65, 'active', '2026-01-01T00:00:00Z'
  ),
  (
    'a0000001-0001-4000-8000-000000000007',
    7, 'Squirtle', ARRAY['water'],
    44, 48, 65, 50, 64, 43, 'active', '2026-01-01T00:00:00Z'
  ),
  (
    'a0000001-0001-4000-8000-000000000016',
    16, 'Pidgey', ARRAY['normal', 'flying'],
    40, 45, 40, 35, 35, 56, 'active', '2026-01-01T00:00:00Z'
  ),
  (
    'a0000001-0001-4000-8000-000000000019',
    19, 'Rattata', ARRAY['normal'],
    30, 56, 35, 25, 35, 72, 'active', '2026-01-01T00:00:00Z'
  ),
  (
    'a0000001-0001-4000-8000-000000000025',
    25, 'Pikachu', ARRAY['electric'],
    35, 55, 40, 50, 50, 90, 'active', '2026-01-01T00:00:00Z'
  )
ON CONFLICT (dex_id) DO NOTHING;
