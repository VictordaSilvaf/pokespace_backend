# Pokémon module

Bounded context for the National Dex / OT catalog and visual asset registry (Pokédex).

## Canonical identity

- Game data uses **`dexId`** (National Dex number). Never confuse with OT **`lookType`** / portrait creature IDs.
- LookType / portrait IDs live in the Asset Registry and optional columns on `pokemon`; they are **AssetReferences** only.

## Stats model (MVP)

| Campo | Significado |
| --- | --- |
| `baseStats` (`hp`, `attack`, …) | Placeholder for classic / future battle formulas. **Not** DarkXPoke OT combat stats. |
| `ot` (`otHp`, `otSpeed`, `experience`) | Values from the OT monster catalog (e.g. hp ≈ 600). Use these for OT-style display. |

Do not mix OT HP and National Dex base HP in the UI without labeling.

## Sprites

- Nest **does not** serve PNG binaries or parse `.dat`/`.spr`.
- Registry stores `path` like `sprites/creature/{lookType}.png` for the frontend CDN/static resolver.
- Detail API also returns `lookType` so the FE can call its local `creatureUrl(lookType)`.

## HTTP

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/pokemon` | No | Catalog: `?q=&type=&limit=&offset=` (default limit 50) |
| `GET` | `/api/v1/pokemon/:dexId` | No | Detail + `assets` + OT flags |
| `GET` | `/api/v1/characters/:id/pokedex` | Bearer | Seen/caught for that character |
| `GET` | `/api/v1/characters/:id/pokedex/:dexId` | Bearer | Single entry |

## Persistence

- `006_create_pokemon.sql` — table + tiny seed
- `007_create_sprite_assets.sql` — sprite tables + seed links
- `009_pokemon_pokedex_fields.sql` — OT / lookType columns
- `010_character_pokedex.sql` — per-character seen/caught

Canonical offline artifacts (committed):

- [`assets/catalog/pokemon-species.json`](../assets/catalog/pokemon-species.json) (~331 species from FE export)
- [`assets/registry/pokemon-visuals.json`](../assets/registry/pokemon-visuals.json) (dexId → lookType)

## Asset / catalog pipeline

Do **not** scan multi-hundred-MB OT packs at runtime.

```bash
pnpm dex:sync        # species JSON → Postgres (+ validates types)
pnpm assets:sync     # visuals JSON → sprite registry JSON → optional DB upsert
pnpm assets:validate # missing portrait/walk, bad geometry, duplicates
```

Type aliases on import: `fire2` → `fire`.

When `DATABASE_URL` is set, sync scripts upsert into Postgres.

## Progress hooks

- **Seen:** wild Pokémon present when the character enters the world (server-side).
- **Caught:** successful `capture` action in battle.

## Out of scope (later)

Flavor text, height/weight, evolution graph API, PokéAPI enrichment, shiny/mega sheets beyond flags.
