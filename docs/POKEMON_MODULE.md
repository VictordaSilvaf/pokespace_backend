# Pokémon module

Bounded context for the National Dex catalog and visual asset registry.

## Canonical identity

- Game data uses **`dexId`** (National Dex number).
- Sprite / creature IDs from OT packs live only in the Asset Registry (`sprite_assets`, `pokemon_visual_assets`).

## HTTP

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/pokemon` | No | Active catalog |
| `GET` | `/api/v1/pokemon/:dexId` | No | Detail + `assets` when registered |

## Persistence

- Migration `006_create_pokemon.sql` — table `pokemon` + seed starters/lab.
- Migration `007_create_sprite_assets.sql` — `sprite_assets` + `pokemon_visual_assets` + seed links.

In-memory mode seeds the same catalog for local/tests (`USE_IN_MEMORY_REPOS` / no pool).

## Asset pipeline

Do **not** scan multi-hundred-MB packs at runtime.

```bash
pnpm assets:sync      # scan pack (or seed) → assets/registry/pokemon-sprites.json → optional DB upsert
pnpm assets:validate  # missing portrait/walk, bad geometry, duplicates
```

Pack root: `POKESPACE_ASSET_PACK_ROOT` or `assets/packs/pokemon/<dexId>/{portrait,walk,...}`.
When `DATABASE_URL` is set, sync upserts into Postgres.

## Out of scope (later phases)

Battle moves, rich evolution graphs, shiny rules — stubs may appear later; combat is Phase 7.
