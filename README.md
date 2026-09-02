# PokeSpace Backend

Backend do PokeSpace — NestJS em monólito modular (DDD + Clean/Hexagonal).

## Arquitetura

Leia [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) para visão completa de camadas, módulos, eventos e evolução para microserviços.

## Setup

```bash
pnpm install
pnpm start:dev
```

API base: `http://localhost:3000/api`

## Endpoints iniciais

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/auth/register` | Registro `{ email, password }` |
| `POST` | `/api/auth/login` | Login `{ email, password }` |

## Estrutura

```
src/
├── shared/                 # Kernel compartilhado + ports/adapters transversais
├── modules/
│   └── identity/           # Autenticação (primeira feature)
│       ├── domain/
│       ├── application/
│       └── infrastructure/
├── health/
├── app.module.ts
└── main.ts
```

## Scripts

```bash
pnpm start:dev   # watch
pnpm test        # unitários
pnpm test:e2e    # e2e
pnpm lint
```

## Variáveis de ambiente

Copie o exemplo e preencha:

```bash
cp .env.example .env
```

| Variável | Default | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP |
| `OBSERVE_APP_KEY` | — | Credencial NestJS Observe |
| `OBSERVE_APP_SECRET` | — | Credencial NestJS Observe |
| `AUTH_TOKEN_SECRET` | `dev-only-change-me` | Segredo do token HMAC |
| `AUTH_TOKEN_TTL` | `3600` | TTL do token (s) |
