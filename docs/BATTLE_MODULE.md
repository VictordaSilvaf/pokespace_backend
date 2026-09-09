# Battle module

Bounded context for wild encounters: moves, damage, status effects, capture.

## HTTP (Bearer)

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/v1/battles/wild` | Start wild battle context |
| `POST` | `/api/v1/battles/:id/actions` | `move` / `capture` / `flee` |

Moves reference optional `missileAssetKey` for the Asset Registry (effects).

Persistence: in-memory repository in v1 (fine for single-node MVP).
