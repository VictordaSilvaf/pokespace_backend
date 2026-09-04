CREATE TABLE IF NOT EXISTS worlds (
  id UUID PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  region VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'online',
  max_players INT NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_worlds_name UNIQUE (name),
  CONSTRAINT ck_worlds_status CHECK (status IN ('online', 'maintenance', 'offline')),
  CONSTRAINT ck_worlds_max_players CHECK (max_players >= 1)
);

INSERT INTO worlds (id, name, region, status, max_players, created_at)
VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'Mercury',
    'mercury',
    'online',
    1100,
    '2026-01-01T00:00:00Z'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Venus',
    'venus',
    'online',
    1100,
    '2026-01-01T00:00:00Z'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'Earth',
    'earth',
    'maintenance',
    1100,
    '2026-01-01T00:00:00Z'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'Mars',
    'mars',
    'online',
    1100,
    '2026-01-01T00:00:00Z'
  ),
  (
    '55555555-5555-5555-8555-555555555555',
    'Jupiter',
    'jupiter',
    'online',
    1100,
    '2026-01-01T00:00:00Z'
  ),
  (
    '66666666-6666-6666-8666-666666666666',
    'Saturn',
    'saturn',
    'online',
    1100,
    '2026-01-01T00:00:00Z'
  ),
  (
    '77777777-7777-7777-8777-777777777777',
    'Uranus',
    'uranus',
    'online',
    1100,
    '2026-01-01T00:00:00Z'
  ),
  (
    '88888888-8888-8888-8888-888888888888',
    'Neptune',
    'neptune',
    'online',
    1100,
    '2026-01-01T00:00:00Z'
  ),
  (
    '99999999-9999-9999-8999-999999999999',
    'Pluto',
    'pluto',
    'online',
    1100,
    '2026-01-01T00:00:00Z'
  )
ON CONFLICT (id) DO NOTHING;
