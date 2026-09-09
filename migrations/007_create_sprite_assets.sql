CREATE TABLE IF NOT EXISTS sprite_assets (
  asset_key VARCHAR(128) PRIMARY KEY,
  path TEXT NOT NULL,
  frame_width INT NOT NULL,
  frame_height INT NOT NULL,
  frame_count INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_sprite_frame_width CHECK (frame_width >= 1),
  CONSTRAINT ck_sprite_frame_height CHECK (frame_height >= 1),
  CONSTRAINT ck_sprite_frame_count CHECK (frame_count >= 1)
);

CREATE TABLE IF NOT EXISTS pokemon_visual_assets (
  dex_id INT NOT NULL REFERENCES pokemon (dex_id) ON DELETE CASCADE,
  visual_type VARCHAR(32) NOT NULL,
  asset_key VARCHAR(128) NOT NULL REFERENCES sprite_assets (asset_key) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (dex_id, visual_type),
  CONSTRAINT ck_pokemon_visual_type CHECK (
    visual_type IN ('portrait', 'walk', 'shiny_walk', 'mega_walk')
  )
);

CREATE INDEX IF NOT EXISTS idx_pokemon_visual_assets_asset_key
  ON pokemon_visual_assets (asset_key);

-- Seed visuals for Phase 1 pokemon (paths are registry keys; pack sync can overwrite).
INSERT INTO sprite_assets (asset_key, path, frame_width, frame_height, frame_count)
VALUES
  ('pokemon/1/portrait', 'sprites/pokemon/1/portrait.png', 64, 64, 1),
  ('pokemon/1/walk', 'sprites/pokemon/1/walk.png', 32, 32, 4),
  ('pokemon/4/portrait', 'sprites/pokemon/4/portrait.png', 64, 64, 1),
  ('pokemon/4/walk', 'sprites/pokemon/4/walk.png', 32, 32, 4),
  ('pokemon/7/portrait', 'sprites/pokemon/7/portrait.png', 64, 64, 1),
  ('pokemon/7/walk', 'sprites/pokemon/7/walk.png', 32, 32, 4),
  ('pokemon/16/portrait', 'sprites/pokemon/16/portrait.png', 64, 64, 1),
  ('pokemon/16/walk', 'sprites/pokemon/16/walk.png', 32, 32, 4),
  ('pokemon/19/portrait', 'sprites/pokemon/19/portrait.png', 64, 64, 1),
  ('pokemon/19/walk', 'sprites/pokemon/19/walk.png', 32, 32, 4),
  ('pokemon/25/portrait', 'sprites/pokemon/25/portrait.png', 64, 64, 1),
  ('pokemon/25/walk', 'sprites/pokemon/25/walk.png', 32, 32, 4)
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO pokemon_visual_assets (dex_id, visual_type, asset_key) VALUES
  (1, 'portrait', 'pokemon/1/portrait'),
  (1, 'walk', 'pokemon/1/walk'),
  (4, 'portrait', 'pokemon/4/portrait'),
  (4, 'walk', 'pokemon/4/walk'),
  (7, 'portrait', 'pokemon/7/portrait'),
  (7, 'walk', 'pokemon/7/walk'),
  (16, 'portrait', 'pokemon/16/portrait'),
  (16, 'walk', 'pokemon/16/walk'),
  (19, 'portrait', 'pokemon/19/portrait'),
  (19, 'walk', 'pokemon/19/walk'),
  (25, 'portrait', 'pokemon/25/portrait'),
  (25, 'walk', 'pokemon/25/walk')
ON CONFLICT (dex_id, visual_type) DO NOTHING;
