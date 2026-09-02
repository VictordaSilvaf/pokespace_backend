# Rotas da API — PokeSpace Backend

Base URL (local): `http://localhost:3000`

Prefixo global: `/api/v1`

Auth nas rotas protegidas: header `Authorization: Bearer <accessToken>`.

---

## Visão geral

| Método | Rota | Auth | Descrição |
| --- | --- | --- | --- |
| `GET` | `/api/v1/health` | Não | Health check do serviço |
| `POST` | `/api/v1/auth/register` | Não | Registra uma nova conta |
| `POST` | `/api/v1/auth/login` | Não | Login por **username** + senha |
| `POST` | `/api/v1/auth/forgot-password` | Não | Solicita reset de senha |
| `POST` | `/api/v1/auth/reset-password` | Não | Confirma nova senha com token |
| `GET` | `/api/v1/auth/me` | Bearer | Perfil da conta autenticada |
| `POST` | `/api/v1/auth/logout` | Bearer | Revoga o access token atual |
| `POST` | `/api/v1/auth/change-password` | Bearer | Troca senha (senha atual + nova) |

---

## Health

### `GET /api/v1/health`

**Response `200`**

```json
{
  "status": "ok",
  "service": "pokespace-backend"
}
```

---

## Auth (Identity)

### Regras de negócio

- **Máximo 4 contas** por mesmo `email` e por mesmo `phone`.
- Cada conta tem um **`username` único**.
- **Login é por `username`**, não por email.

---

### `POST /api/v1/auth/register`

**Body**

```json
{
  "email": "ash@poke.space",
  "phone": "11999998888",
  "username": "ash_ketchum",
  "password": "pikachu123"
}
```

**Response `201`**

```json
{
  "userId": "uuid",
  "email": "ash@poke.space",
  "phone": "11999998888",
  "username": "ash_ketchum",
  "accessToken": "..."
}
```

**Erros:** `400` inválido · `409` username em uso ou limite de contas

---

### `POST /api/v1/auth/login`

**Body**

```json
{
  "username": "ash_ketchum",
  "password": "pikachu123"
}
```

**Response `200`** — mesmo shape do register (com `accessToken`)

**Erros:** `400` · `401` credenciais inválidas

---

### `POST /api/v1/auth/forgot-password`

Solicita reset para uma conta (`username`). Resposta **sempre genérica** (sem enumeration).

**Body**

```json
{
  "username": "ash_ketchum"
}
```

**Response `200`**

```json
{
  "message": "If the account exists, reset instructions were sent"
}
```

Com `AUTH_EXPOSE_RESET_TOKEN=true` (dev), inclui `resetToken` para testes/Postman.

---

### `POST /api/v1/auth/reset-password`

**Body**

```json
{
  "token": "...",
  "newPassword": "novaSenha123"
}
```

**Response `200`**

```json
{
  "message": "Password updated"
}
```

**Erros:** `400` · `401` token inválido/expirado

---

### `GET /api/v1/auth/me`

**Headers:** `Authorization: Bearer <accessToken>`

**Response `200`**

```json
{
  "userId": "uuid",
  "email": "ash@poke.space",
  "phone": "11999998888",
  "username": "ash_ketchum"
}
```

**Erros:** `401` token inválido/revogado

---

### `POST /api/v1/auth/logout`

**Headers:** `Authorization: Bearer <accessToken>`

**Response `204`** (sem body)

---

### `POST /api/v1/auth/change-password`

**Headers:** `Authorization: Bearer <accessToken>`

**Body**

```json
{
  "currentPassword": "pikachu123",
  "newPassword": "novaSenha123"
}
```

**Response `200`**

```json
{
  "message": "Password updated"
}
```

**Erros:** `400` · `401` senha atual incorreta ou token inválido

---

## Exemplos (curl)

```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"ash@poke.space","phone":"11999998888","username":"ash_ketchum","password":"pikachu123"}'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"ash_ketchum","password":"pikachu123"}'

# Me
curl http://localhost:3000/api/v1/auth/me \
  -H 'Authorization: Bearer <accessToken>'

# Forgot / reset (dev com AUTH_EXPOSE_RESET_TOKEN=true)
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H 'Content-Type: application/json' \
  -d '{"username":"ash_ketchum"}'

curl -X POST http://localhost:3000/api/v1/auth/reset-password \
  -H 'Content-Type: application/json' \
  -d '{"token":"<resetToken>","newPassword":"novaSenha123"}'

# Change password
curl -X POST http://localhost:3000/api/v1/auth/change-password \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"currentPassword":"pikachu123","newPassword":"novaSenha123"}'

# Logout
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H 'Authorization: Bearer <accessToken>'
```
