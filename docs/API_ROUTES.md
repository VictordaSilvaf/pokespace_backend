# Rotas da API — PokeSpace Backend

Base URL (local): `http://localhost:3000`

Prefixo global: `/api/v1`

Documentação interativa: `http://localhost:3000/api/docs`

Auth nas rotas protegidas: header `Authorization: Bearer <accessToken>`.

---

## Visão geral

| Método | Rota | Auth | Descrição |
| --- | --- | --- | --- |
| `GET` | `/api/v1/health` | Não | Health check |
| `POST` | `/api/v1/auth/register` | Não | Registra conta |
| `POST` | `/api/v1/auth/login` | Não | Login por **username** ou **email** |
| `POST` | `/api/v1/auth/refresh` | Não | Renova tokens (body ou cookie) |
| `POST` | `/api/v1/auth/verify-email` | Não | Confirma e-mail |
| `POST` | `/api/v1/auth/resend-verification` | Bearer | Reenvia e-mail de verificação |
| `POST` | `/api/v1/auth/send-phone-otp` | Bearer | Envia OTP de telefone (e-mail em dev) |
| `POST` | `/api/v1/auth/verify-phone` | Bearer | Confirma telefone com OTP |
| `POST` | `/api/v1/auth/2fa/setup` | Bearer | Inicia configuração 2FA |
| `POST` | `/api/v1/auth/2fa/confirm` | Bearer | Ativa 2FA |
| `POST` | `/api/v1/auth/2fa/disable` | Bearer | Desativa 2FA |
| `POST` | `/api/v1/auth/2fa/verify` | Não | Completa login com 2FA |
| `GET` | `/api/v1/auth/sessions` | Bearer | Lista sessões ativas |
| `DELETE` | `/api/v1/auth/sessions/:sessionId` | Bearer | Revoga sessão específica |
| `POST` | `/api/v1/auth/logout-all` | Bearer | Revoga todas as sessões |
| `POST` | `/api/v1/auth/forgot-password` | Não | Solicita reset de senha |
| `POST` | `/api/v1/auth/reset-password` | Não | Confirma nova senha |
| `GET` | `/api/v1/auth/me` | Bearer | Perfil autenticado |
| `PATCH` | `/api/v1/auth/me` | Bearer | Atualiza e-mail/telefone |
| `POST` | `/api/v1/auth/logout` | Bearer | Revoga sessão atual |
| `POST` | `/api/v1/auth/change-password` | Bearer | Troca senha |
| `POST` | `/api/v1/auth/deactivate` | Bearer | Desativa conta |
| `DELETE` | `/api/v1/auth/account` | Bearer | Exclui conta |
| `GET` | `/api/v1/servers` | Não | Lista servidores |
| `GET` | `/api/v1/servers/:id` | Não | Detalhe de um servidor |
| `POST` | `/api/v1/characters` | Bearer | Cria personagem + spawn do laboratório (header opcional `Idempotency-Key`) |
| `GET` | `/api/v1/characters` | Bearer | Lista personagens da conta |
| `GET` | `/api/v1/characters/:id` | Bearer | Detalhe de personagem |
| `GET` | `/api/v1/pokemon` | Não | Catálogo paginado (`?q=&type=&limit=&offset=`) |
| `GET` | `/api/v1/pokemon/:dexId` | Não | Detalhe por dexId (+ assets / OT) |
| `GET` | `/api/v1/characters/:id/pokedex` | Bearer | Progresso seen/caught |
| `GET` | `/api/v1/characters/:id/pokedex/:dexId` | Bearer | Entrada única |
| `GET` | `/api/v1/maps/:mapId` | Não | Metadata do mapa + referência de asset |
| `POST` | `/api/v1/battles/wild` | Bearer | Inicia batalha vs wild |
| `POST` | `/api/v1/battles/:battleId/actions` | Bearer | move / capture / flee |

---

## Auth

### Regras

- Máximo **4 contas** por `email` e por `phone`
- `username` único
- Login por `identifier` (username ou email)
- Access token JWT (default 15 min) + refresh token (default 7 dias)
- Refresh token **rotacionado** a cada `/refresh`
- Troca/reset de senha **invalida todas as sessões**
- Rate limit em login, forgot-password, refresh e 2FA

### Register / Login response

```json
{
  "userId": "uuid",
  "email": "ash@poke.space",
  "phone": "11999998888",
  "username": "ash_ketchum",
  "accessToken": "...",
  "refreshToken": "...",
  "sessionId": "uuid"
}
```

Login com 2FA ativo:

```json
{
  "requires2fa": true,
  "tempToken": "..."
}
```

### `GET /auth/me`

Inclui: `emailVerified`, `phoneVerified`, `twoFactorEnabled`, `status`

### Cookies (web)

Com `AUTH_REFRESH_COOKIE=true`, login/register/refresh definem cookie `httpOnly` em `/api/v1/auth`.

### Dev helpers

| Env | Efeito |
| --- | --- |
| `AUTH_EXPOSE_RESET_TOKEN=true` | expõe `resetToken` no forgot-password |
| `AUTH_EXPOSE_VERIFY_EMAIL_TOKEN=true` | expõe `verifyToken` no register/resend |
| `AUTH_EXPOSE_PHONE_OTP=true` | expõe `otp` no send-phone-otp |

### Mailpit (local)

- UI: `http://localhost:8025`
- SMTP: `localhost:1025`

---

## Servers

Catálogo de servidores. Somente leitura. Seed via migration `003_create_worlds.sql` (9 servidors: Mercury…Pluto; Earth em `maintenance`).

### `GET /api/v1/servers`

**Auth:** não

**Response `200`:** array ordenado por status (`online` → `maintenance` → `offline`), depois `name` ASC

```json
{
  "serverId": "11111111-1111-4111-8111-111111111111",
  "name": "Mercury",
  "region": "mercury",
  "status": "online",
  "maxPlayers": 1100
}
```

`status`: `online` | `maintenance` | `offline`.

### `GET /api/v1/servers/:id`

**Auth:** não

**Response `200`:** mesmo objeto.

**Response `400`:** `:id` não é UUID v4.

**Response `404`:** servidor inexistente.

---

## Exemplos

```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"ash@poke.space","phone":"11999998888","username":"ash_ketchum","password":"pikachu123"}'

# Login (username ou email)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"ash_ketchum","password":"pikachu123"}'

# Refresh
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<refreshToken>"}'

# Verify email
curl -X POST http://localhost:3000/api/v1/auth/verify-email \
  -H 'Content-Type: application/json' \
  -d '{"token":"<verifyToken>"}'

# Sessions
curl http://localhost:3000/api/v1/auth/sessions \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'X-Session-Id: <sessionId>'

# Logout all
curl -X POST http://localhost:3000/api/v1/auth/logout-all \
  -H 'Authorization: Bearer <accessToken>'

# Characters (empty after register)
curl http://localhost:3000/api/v1/characters \
  -H 'Authorization: Bearer <accessToken>'

# Create character (returns laboratory spawn)
curl -X POST http://localhost:3000/api/v1/characters \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: create-ash-lab-1' \
  -d '{"name":"Ash","serverId":"11111111-1111-4111-8111-111111111111"}'
```

---

## Characters

### `POST /characters`

Auth: Bearer.

Header opcional: `Idempotency-Key` (1–128 ASCII imprimíveis). Com a mesma key e o mesmo payload, retries devolvem o resultado anterior (DynamoDB / store in-memory). Key reutilizada com payload diferente → `400`. Key em processamento → `409`.

```json
{ "name": "Ash", "serverId": "<uuid>" }
```

Response `201`:

```json
{
  "character": { "id": "uuid", "name": "Ash", "serverId": "uuid" },
  "spawn": {
    "mapId": "laboratory",
    "instanceId": "laboratory-01",
    "position": { "x": 10, "y": 8, "z": 0 }
  }
}
```

Personagem só pode ser criado em servidor `online` (joinable). Nome único por servidor. Máximo 5 por conta.

---

## World Engine (WebSocket)

Namespace: `/world`

Auth no handshake: `auth.token` = access JWT (ou `Authorization: Bearer`).

### Client → Server

| Evento | Payload |
| --- | --- |
| `WORLD_ENTER` | `{ "characterId": "uuid", "mapId?": "laboratory" }` |
| `MOVE` | `{ "direction": "UP\|DOWN\|LEFT\|RIGHT", "sequence": 1 }` |
| `WORLD_LEAVE` | `{}` |

### Server → Client

| Evento | Descrição |
| --- | --- |
| `WORLD_SNAPSHOT` | Estado da instância ao entrar (entities com `visual` / `direction`) |
| `ENTITY_SPAWNED` | Outro jogador entrou |
| `ENTITY_MOVED` | Movimento validado pelo servidor |
| `ENTITY_DESPAWNED` | Jogador saiu / desconectou |
| `pokemon.spawned` | Wild Pokémon spawnou na instância |
| `pokemon.despawned` | Wild Pokémon despawnou |
| `WORLD_ERROR` | Erro de auth / movimento / sessão |

Movimento é **server-authoritative**: o cliente envia intenção, o servidor valida colisão/sequência e faz broadcast. Posição/direção do Character são persistidas em `character_world_state` e hidratadas no próximo `WORLD_ENTER`.

---

## Pokémon

### `GET /api/v1/pokemon`

Lista paginada do catálogo ativo (`limit` default 50, max 100). Query: `q`, `type`, `limit`, `offset`.

```json
{
  "items": [
    {
      "dexId": 1,
      "name": "Bulbasaur",
      "types": ["grass"],
      "status": "active",
      "lookType": 376,
      "assets": { "portrait": { "path": "sprites/creature/376.png", "lookType": 376 } }
    }
  ],
  "total": 331,
  "limit": 50,
  "offset": 0
}
```

### `GET /api/v1/pokemon/:dexId`

Detalhe por National Dex id. Inclui `ot` (stats DarkXPoke), `flags`, `baseStats` (placeholder) e `assets`.

### `GET /api/v1/characters/:id/pokedex`

Auth Bearer. Só o dono do personagem. Retorna `{ totalCatalog, seen, caught, entries[] }`.

### `GET /api/v1/characters/:id/pokedex/:dexId`

Entrada `{ dexId, seenAt, caughtAt, discovered }`.

Pipeline offline: `pnpm dex:sync` / `pnpm assets:sync` / `pnpm assets:validate` (ver `docs/POKEMON_MODULE.md`).

---

## Maps

### `GET /api/v1/maps/:mapId`

Retorna metadata do mapa Tiled (ex.: `laboratory`) e referência do asset JSON.

```json
{
  "mapId": "laboratory",
  "displayName": "Professor Oak Laboratory",
  "defaultInstanceCapacity": 50,
  "asset": "laboratory.json",
  "version": "1",
  "width": 20,
  "height": 16,
  "tileSize": 32,
  "chunkSize": 16,
  "tilesets": [],
  "chunks": { "count": 2, "pathPattern": "chunks/{cx}_{cy}.json" },
  "spawnZones": []
}
```

Pipeline: `pnpm maps:convert laboratory` (Tiled → chunks; OTBM path via `OTBM_PATH` quando o parser existir).

---

## Battle

### `POST /api/v1/battles/wild`

Body: `{ characterId, playerDexId, playerLevel, wildDexId, wildLevel, wildEntityId? }`

O `characterId` deve pertencer à conta autenticada.

Retorna contexto de batalha com moves do seed catalog (`tackle`, `ember`, …) e stats derivados.

### `POST /api/v1/battles/:battleId/actions`

Body: `{ "characterId": "uuid", "action": "move"|"capture"|"flee", "moveId?", "ballBonus?" }`

Aplica dano/efeito, tentativa de captura ou fuga. O `characterId` deve ser o mesmo da batalha e pertencente à conta autenticada. Estado de batalha é in-memory (v1).
