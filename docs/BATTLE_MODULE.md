# Battle module

Bounded context for wild encounters: moves, damage, status effects, capture.

## HTTP (Bearer)

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/v1/battles/wild` | Start wild battle context |
| `POST` | `/api/v1/battles/:id/actions` | `move` / `capture` / `flee` |

## WebSocket (`/world` namespace)

Linked from world movement — not a separate battle gateway.

| Event / message | Direction | Description |
| --- | --- | --- |
| `battle.encounter` | server → client | Zone roll succeeded (dex/level) |
| `battle.started` | server → client | Auto-starts wild battle after encounter (includes moves + `missileAssetKey` effects) |
| `battle.updated` | server → client | After `BATTLE_ACTION` |
| `battle.error` | server → client | Start/action failure |
| `BATTLE_ACTION` | client → server | `{ battleId, characterId, action, moveId?, ballBonus? }` |

Moves reference optional `missileAssetKey` for the Asset Registry (effects/missiles from client-assets manifest).

Persistence: in-memory repository in v1 (fine for single-node MVP).
MVP encounter uses default player lead (dex 25 / lv 5) until party inventory is wired.
