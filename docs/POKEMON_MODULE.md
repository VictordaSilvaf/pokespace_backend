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

- Nest **does not** parse `.dat`/`.spr` at runtime.
- Registry stores relative `path` values like `sprites/creature/{lookType}.png` (Postgres stays relative).
- HTTP responses apply `resolveS3PublicUrl(path)` when `S3_PUBLIC_BASE_URL` is a **browser CDN** (r2.dev or custom domain). The S3 API host `*.r2.cloudflarestorage.com` is ignored.
- Detail API also returns `lookType` so the FE can resolve `creatureUrl(lookType)` via `VITE_ASSETS_BASE_URL`.

### R2 CDN pipeline

1. **Upload PNGs** (creature + item only; not catalog/registry JSON):

```bash
pnpm assets:upload-r2
# → s3://$S3_BUCKET/sprites/creature/*.png and .../item/*.png
# Cache-Control: public, max-age=31536000, immutable
```

2. **Public URL** (pick one):

| Option | How |
| --- | --- |
| r2.dev (preferred for quick public) | Cloudflare dashboard → bucket → Public Development URL → Allow, **or** `CLOUDFLARE_API_TOKEN=... pnpm assets:enable-r2-public` |
| Custom domain | Attach hostname to the bucket in Cloudflare |
| Nest `/cdn` (interim) | Deploy API with `S3_DRIVER=s3`; set `S3_PUBLIC_BASE_URL=https://<api-host>/cdn` |
| Local smoke | `pnpm assets:serve-r2` → `http://127.0.0.1:8787` |

3. Set env (same public base on API + FE):

```env
S3_PUBLIC_BASE_URL=https://pub-xxxx.r2.dev
# frontend:
# VITE_ASSETS_BASE_URL=https://pub-xxxx.r2.dev
```

4. Smoke: `GET $S3_PUBLIC_BASE_URL/sprites/creature/376.png` → `200` + `image/png`.

Do **not** commit `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`. Rotate R2 tokens if they ever leaked in chat.

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
