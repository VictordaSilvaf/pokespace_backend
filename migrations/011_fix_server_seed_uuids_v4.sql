-- Fix seeded server IDs that were not valid UUID v4 (rejected by @IsUUID('4')).
-- Old → new (version nibble forced to 4):
--   jupiter 5555-5555 → 5555-4555
--   saturn  6666-6666 → 6666-4666
--   uranus  7777-7777 → 7777-4777
--   neptune 8888-8888 → 8888-4888
--   pluto   9999-9999 → 9999-4999

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'characters'
  ) THEN
    ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_server_id_fkey;
    ALTER TABLE characters
      ADD CONSTRAINT characters_server_id_fkey
      FOREIGN KEY (server_id) REFERENCES servers (id) ON UPDATE CASCADE;
  END IF;
END $$;

UPDATE servers SET id = '55555555-5555-4555-8555-555555555555'
WHERE id = '55555555-5555-5555-8555-555555555555';

UPDATE servers SET id = '66666666-6666-4666-8666-666666666666'
WHERE id = '66666666-6666-6666-8666-666666666666';

UPDATE servers SET id = '77777777-7777-4777-8777-777777777777'
WHERE id = '77777777-7777-7777-8777-777777777777';

UPDATE servers SET id = '88888888-8888-4888-8888-888888888888'
WHERE id = '88888888-8888-8888-8888-888888888888';

UPDATE servers SET id = '99999999-9999-4999-8999-999999999999'
WHERE id = '99999999-9999-9999-8999-999999999999';
