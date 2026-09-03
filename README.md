# PokeSpace Backend

Backend do PokeSpace — NestJS em monólito modular (DDD + Clean/Hexagonal).

## Arquitetura

Leia [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) para visão completa de camadas, módulos, eventos e evolução para microserviços.

## Rotas

Catálogo das rotas HTTP: [docs/API_ROUTES.md](./docs/API_ROUTES.md).

## Setup

```bash
cp .env.example .env
pnpm install
pnpm start:dev
```

API base: `http://localhost:3000/api/v1`

## Docker

Requer `.env` na raiz (veja `.env.example`).

```bash
# stack completa (api + postgres + redis + rabbitmq + kafka)
docker compose up --build -d

# só infra (para rodar a API com pnpm start:dev)
docker compose up -d postgres redis rabbitmq kafka

# logs / parar
docker compose logs -f
docker compose down
```

| Serviço | Host | Uso |
| --- | --- | --- |
| API | `http://localhost:3000` | NestJS |
| Postgres | `localhost:5432` | Persistência |
| Redis | `localhost:6379` | Cache / sessão / realtime |
| RabbitMQ | `localhost:5672` | Filas (jobs) |
| RabbitMQ UI | `http://localhost:15672` | Management (`pokespace` / `pokespace`) |
| Kafka | `localhost:9092` | Event streaming |
| Mailpit UI | `http://localhost:8025` | E-mails de dev (verificação, reset, OTP) |
| Mailpit SMTP | `localhost:1025` | SMTP local |

Health da API: `http://localhost:3000/api/v1/health`

Swagger: `http://localhost:3000/api/docs`

## Endpoints iniciais

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Health check |
| `POST` | `/api/v1/auth/register` | Registro |
| `POST` | `/api/v1/auth/login` | Login por username ou email |
| `POST` | `/api/v1/auth/refresh` | Renova tokens |
| `GET` | `/api/v1/auth/me` | Perfil (Bearer) |
| `GET` | `/api/v1/auth/sessions` | Sessões ativas (Bearer) |

Rotas completas: [docs/API_ROUTES.md](./docs/API_ROUTES.md).

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
| `AUTH_TOKEN_SECRET` | `dev-only-change-me` | Segredo JWT |
| `AUTH_TOKEN_TTL` | `900` | TTL access token (s) |
| `AUTH_REFRESH_TOKEN_TTL` | `604800` | TTL refresh token (s) |
| `AUTH_REFRESH_COOKIE` | `false` | Cookie httpOnly para refresh (web) |
| `AUTH_MAX_LOGIN_ATTEMPTS` | `5` | Tentativas antes do lockout |
| `AUTH_LOCKOUT_TTL` | `900` | Duração do lockout (s) |
| `AUTH_EXPOSE_RESET_TOKEN` | `false` | Expõe reset token (dev) |
| `AUTH_EXPOSE_VERIFY_EMAIL_TOKEN` | `false` | Expõe verify token (dev) |
| `AUTH_EXPOSE_PHONE_OTP` | `false` | Expõe OTP telefone (dev) |
| `SMTP_HOST` | `localhost` | SMTP (Mailpit local) |
| `SMTP_PORT` | `1025` | Porta SMTP |
| `REDIS_URL` | `redis://localhost:6379` | Redis (sessões, rate limit) |
| `REDIS_DRIVER` | — | `memory` nos testes |
| `DATABASE_URL` | `postgresql://...` | Postgres |
| `RABBITMQ_URL` | `amqp://pokespace:pokespace@localhost:5672` | RabbitMQ |
| `KAFKA_BROKERS` | `localhost:9092` | Kafka (via host) |
