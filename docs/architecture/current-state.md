# PokeSpace Backend — Current State

> Live inventory of what is implemented vs the import→runtime roadmap.  
> Companion: frontend [`pokespace_frontend/docs/architecture/current-state.md`](../../../pokespace_frontend/docs/architecture/current-state.md).  
> Style guide: [`../ARCHITECTURE.md`](../ARCHITECTURE.md).

**Rule:** Nest is the World Engine source of truth. Runtime must never read `.dat`, `.spr`, or `.otbm` — those belong to offline import tools (frontend `tools/`).

---

## 1. Stack and modules

| Layer | Choice |
| --- | --- |
| Framework | NestJS 12 (HTTP + Socket.IO) |
| Language | TypeScript (ESM) |
| API | REST `/api/v1`, Swagger `/api/docs` |
| Realtime | Socket.IO namespace `/world` |
| Persist | PostgreSQL (`pg`), Redis (`ioredis`), DynamoDB (idempotency) |
| Queues | RabbitMQ / Kafka provisioned; **not wired in `src/` yet** (in-memory events) |

| Module | Path | Purpose |
| --- | --- | --- |
| shared | `src/shared/` | Kernel, Postgres, Redis, Dynamo, events |
| identity | `src/modules/identity/` | Auth, sessions, OTP, denylist |
| idempotency | `src/modules/idempotency/` | Idempotent commands |
| servers | `src/modules/servers/` | Game server catalog |
| character | `src/modules/character/` | Characters + world pose |
| world | `src/modules/world/` | Maps, instances, move, collision, interest, wild spawn |
| realtime | `src/modules/realtime/` | Socket.IO gateway |
| pokemon | `src/modules/pokemon/` | Dex + asset registry |
| battle | `src/modules/battle/` | Wild battle HTTP (in-memory) |

---

## 2. World module

**HTTP:** `GET /api/v1/maps/:mapId`

**Use cases:** `EnterWorld`, `LeaveWorld`, `MoveEntity`, `GetWorldSnapshot`, `ResolveLaboratorySpawn`, `GetMapMetadata`.

**Services:** `InstanceManager` (in-process), `SessionManager`, `WildSpawnService`, `NpcSpawnService`, `EncounterService`, `InterestAreaService` (Chebyshev radius 24 on enter + MOVE broadcast), `SharedWorldStateService` (Redis presence **write-only** TTL 120s — single-node MVP; cross-replica read not required for Lab).

**Collision:** `CollisionService` + occupancy on `MapInstance`. Server-authoritative; step size 1.

**Map load:** `FileWorldMapRepository` reads `maps/<mapId>/metadata.json` + Tiled `<mapId>.json` (layers `Collision`, `Spawns`). **Does not load `chunks/` at runtime** (full map in memory).

**Default map:** `laboratory`.

---

## 3. Realtime events (`/world`)

**Client → server:** `WORLD_ENTER`, `MOVE`, `WORLD_LEAVE` (JWT in handshake).

**Server → client:** `WORLD_SNAPSHOT`, `ENTITY_SPAWNED`, `ENTITY_MOVED`, `ENTITY_DESPAWNED`, `pokemon.spawned`, `pokemon.despawned`, `WORLD_ERROR`.

**Rooms:** `instance:<instanceId>` (move broadcasts are room-wide, not interest-filtered).

---

## 4. Character world state

VO `mapId, x, y, z, direction` → Postgres `character_world_state` (migration `008`). Saved on accepted move and leave. Restored on enter when walkable.

---

## 5. Pokémon asset registry

- Port + Postgres (`sprite_assets`, `pokemon_visual_assets`) + JSON `assets/registry/pokemon-sprites.json`
- Visual kinds: `portrait`, `walk`, `shiny_walk`, `mega_walk`
- Identity: **`dexId`** (never treat OT spriteId as dexId)
- `pnpm assets:sync` / `assets:validate` — pack scan or seed (1,4,7,16,19,25)
- **No DAT/SPR parser in backend**

---

## 6. Battle

HTTP: `POST /battles/wild`, `POST /battles/:id/actions` (move/capture/flee). In-memory repo. **Not** hooked to world move or WS.

---

## 7. Scripts

| Script | Behavior | Gap |
| --- | --- | --- |
| `pnpm assets:sync` | Pack → registry JSON (+ optional DB) | No client DAT/SPR |
| `pnpm assets:validate` | Registry integrity | No disk existence for seed paths |
| `pnpm maps:convert` | Tiled → `chunks/{cx}_{cy}.json`; warns if `OTBM_PATH` set | **No binary OTBM parser**; runtime ignores chunks |

---

## 8. `maps/laboratory`

```text
maps/laboratory/
  metadata.json      # spawnZones, chunkSize 16, tilesets
  laboratory.json    # Tiled 20×16, tile 16px
  chunks/0_0.json, 1_0.json
```

---

## 9. Infra usage

| System | Used in app? |
| --- | --- |
| Postgres | Yes — users, characters, pokemon, assets |
| Redis | Yes — auth stores, throttler, presence write |
| DynamoDB | Yes — idempotency |
| RabbitMQ / Kafka | Provisioned only |

---

## 10. Tests

- Unit: world-flow, collision-spawn, map-instance, position, instance-manager
- E2E: `test/laboratory-multiplayer.e2e-spec.ts` (2 players via Socket.IO)
- Done this roadmap pass: interest on MOVE, encounter→`battle.started`, `world:validate`, FE Socket.IO MOVE/battle
- Still open: Redis presence cross-replica (post-MVP), full OTBM `global_dash`, party-backed encounter lead

---

## 11. Roadmap matrix

| Phase | Status | Notes |
| --- | --- | --- |
| F0 Inventory | **Done** (this doc) | |
| F1–4 Client assets | Partial (FE tools) | `pokespace_frontend/tools/client-assets` |
| F5–6 Pokemon visual | Partial | Registry + `pokemon-visuals.json` + FE `PokemonVisual` |
| F7–9 OTBM/chunks | Partial | `loadChunk` + z-named chunks; OTBM via FE exporter |
| F10–14 World/WS/interest | Partial | Interest on MOVE; FE Socket.IO + server MOVE |
| F15 Lab MVP | Partial | BE e2e + FE WS/move; live two-browser QA remaining |
| F16–19 NPC/wild/encounter/battle | Partial | NPC spawn + encounter→`battle.started` WS + `BATTLE_ACTION` |
| F20–24 Infra/tests/validate | Partial | `world:validate` / `assets:validate`; Redis presence write-only (single-node MVP) |

---

## Extension points (do not duplicate)

1. Extend Nest `world` / `realtime` — no second engine in the frontend.
2. Offline convert `.otbm`/`.dat`/`.spr` → `maps/` + `assets/registry/` only.
3. NPCs via `EntityType.NPC` + `WorldEntity`.
4. Encounter inside `MoveEntityUseCase` before battle.
5. Add `loadChunk` to `FileWorldMapRepository` when chunk format is ready.
6. Keep Kafka/Rabbit off the movement hot path.
