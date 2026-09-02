# Rotas da API — PokeSpace Backend

Base URL (local): `http://localhost:3000`

Prefixo global: `/api/v1`

---

## Visão geral

| Método | Rota | Módulo | Auth | Descrição |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/health` | Health | Não | Health check do serviço |
| `POST` | `/api/v1/auth/register` | Identity | Não | Registra um novo usuário |
| `POST` | `/api/v1/auth/login` | Identity | Não | Autentica e retorna access token |

---

## Health

### `GET /api/v1/health`

Verifica se a API está no ar.

**Response `200`**

```json
{
  "status": "ok",
  "service": "pokespace-backend"
}
```

---

## Auth (Identity)

### `POST /api/v1/auth/register`

Cria um usuário e retorna um access token.

**Body**

```json
{
  "email": "ash@poke.space",
  "password": "pikachu123"
}
```

| Campo | Tipo | Regras |
| --- | --- | --- |
| `email` | `string` | Obrigatório, formato de e-mail válido |
| `password` | `string` | Obrigatório, mínimo 8 caracteres |

**Response `201`**

```json
{
  "userId": "uuid",
  "email": "ash@poke.space",
  "accessToken": "..."
}
```

**Erros**

| Status | Quando |
| --- | --- |
| `400` | Body incompleto, e-mail inválido ou senha fraca |
| `409` | E-mail já registrado |

---

### `POST /api/v1/auth/login`

Autentica um usuário existente.

**Body**

```json
{
  "email": "ash@poke.space",
  "password": "pikachu123"
}
```

| Campo | Tipo | Regras |
| --- | --- | --- |
| `email` | `string` | Obrigatório |
| `password` | `string` | Obrigatório |

**Response `200`**

```json
{
  "userId": "uuid",
  "email": "ash@poke.space",
  "accessToken": "..."
}
```

**Erros**

| Status | Quando |
| --- | --- |
| `400` | Body incompleto ou e-mail inválido |
| `401` | Credenciais inválidas |

---

## Exemplos rápidos (curl)

```bash
# Health
curl http://localhost:3000/api/v1/health

# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"ash@poke.space","password":"pikachu123"}'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ash@poke.space","password":"pikachu123"}'
```
