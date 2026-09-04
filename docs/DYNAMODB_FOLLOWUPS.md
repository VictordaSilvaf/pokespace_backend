# Follow-ups (not in this delivery)

## Player History (Phase 3)

- Table `game-{env}-player-history` is provisioned in Terraform and LocalStack.
- App module `player-history` is **not** implemented yet.
- When building it: port `append` + `listByPlayer`; PutItem/Query only; keep payloads small.

## Player State (Phase 4)

- Realtime player state remains in **Redis** (World Engine).
- Do **not** write every movement to DynamoDB.
- Re-evaluate only with production metrics (Redis memory, Postgres load, concurrency).
