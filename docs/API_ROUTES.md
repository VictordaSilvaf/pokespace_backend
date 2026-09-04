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
| `GET` | `/api/v1/worlds` | Não | Lista mundos (servidores) |
| `GET` | `/api/v1/worlds/:id` | Não | Detalhe de um mundo |
| `GET` | `/api/v1/characters` | Bearer | Lista personagens da conta |
| `GET` | `/api/v1/characters/creation-options` | Bearer | Mundos online + skins iniciais |
| `POST` | `/api/v1/characters` | Bearer | Cria personagem (`worldId` imutável) |
| `GET` | `/api/v1/characters/:id` | Bearer | Detalhe (somente dono) |

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

## World

Catálogo de servidores. Somente leitura. Seed via migration `003_create_worlds.sql` (9 mundos: Mercury…Pluto; Earth em `maintenance`).

### `GET /api/v1/worlds`

**Auth:** não

**Response `200`:** array ordenado por status (`online` → `maintenance` → `offline`), depois `name` ASC

```json
{
  "worldId": "11111111-1111-4111-8111-111111111111",
  "name": "Mercury",
  "region": "mercury",
  "status": "online",
  "maxPlayers": 1100
}
```

`status`: `online` | `maintenance` | `offline`.

### `GET /api/v1/worlds/:id`

**Auth:** não

**Response `200`:** mesmo objeto.

**Response `400`:** `:id` não é UUID v4.

**Response `404`:** mundo inexistente.

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

# Creation options (online worlds + starter skins)
curl http://localhost:3000/api/v1/characters/creation-options \
  -H 'Authorization: Bearer <accessToken>'

# Create character (world is immutable afterwards)
curl -X POST http://localhost:3000/api/v1/characters \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"worldId":"11111111-1111-4111-8111-111111111111","skinId":"starter-boy-01","displayName":"Ash"}'
```

---

## Characters

- Máximo **4** personagens por conta (`CHARACTER_MAX_PER_ACCOUNT`, default 4)
- `worldId` escolhido na criação e **imutável**
- Vários personagens no mesmo mundo são permitidos (política A)
- `displayName` único por conta (case-insensitive)
- Criação só em mundos `online` (`world.isJoinable()`)
- Skins iniciais: `starter-boy-01`, `starter-girl-01`, `starter-boy-02`, `starter-girl-02`
