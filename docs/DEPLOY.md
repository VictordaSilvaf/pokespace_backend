# Deploy (CI/CD)

Esteira: **GitHub Actions → GHCR → VPS (Docker Compose)**.  
Staging no mesmo VPS (`pokespace-staging`, porta `3001`). Produção exige approval no Environment `production`.

`dex:sync` / `assets:sync` **não** rodam no deploy automático — use o workflow `Catalog sync` ou `scripts/deploy/catalog-sync.sh`.

## Fluxo

```
PR  → ci.yml (lint, test, build, docker build)
main → release.yml
       1. build/push ghcr.io/victordasilvaf/pokespace-api:<sha> (+ tag main)
       2. deploy staging (auto)
       3. deploy production (environment approval)
```

Imagem imutável por SHA. Rollback = redeploy da tag anterior.

## Arquivos

| Arquivo | Uso |
| --- | --- |
| [`docker-compose.prod.yml`](../docker-compose.prod.yml) | Prod + rede externa Caddy |
| [`docker-compose.staging.yml`](../docker-compose.staging.yml) | Staging isolado (sem Caddy) |
| [`scripts/deploy/remote-deploy.sh`](../scripts/deploy/remote-deploy.sh) | Pull imagem + `up -d api` + health gate |
| [`scripts/deploy/catalog-sync.sh`](../scripts/deploy/catalog-sync.sh) | Dex/assets sync one-shot |
| [`.env.production.example`](../.env.production.example) / [`.env.staging.example`](../.env.staging.example) | Templates (nunca commitar `.env.*` reais) |

## Checklist one-time (VPS)

1. **User de deploy** no grupo `docker`, com chave SSH dedicada (sem senha interativa).
2. **Clone** do repo (ex.: `/var/www/pokespace_backend`) acessível pelo user de deploy.
3. **Env files** no host (fora do git):
   ```bash
   cp .env.production.example .env.production
   cp .env.staging.example .env.staging
   # preencher secrets distintos entre staging e prod
   ```
4. **Rede Caddy** (só prod): deve existir `inspector-prod_inspector_egress` (projeto Inspector). O compose de prod anexa a API automaticamente — não use mais `docker network connect` manual.
5. **Bootstrap staging** (primeira vez, sobe infra + API):
   ```bash
   cd /var/www/pokespace_backend
   docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build
   ```
6. **Bootstrap prod** se ainda não estiver no ar com a rede Caddy no compose:
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
   ```
7. Confirme health:
   - Staging: `curl -fsS http://127.0.0.1:3001/api/v1/health`
   - Prod: `curl -fsS http://127.0.0.1:3000/api/v1/health`

## Checklist one-time (GitHub)

### Secrets (Settings → Secrets and variables → Actions)

| Secret | Descrição |
| --- | --- |
| `DEPLOY_HOST` | Host/IP do VPS |
| `DEPLOY_USER` | User SSH de deploy |
| `DEPLOY_SSH_KEY` | Chave privada PEM |
| `GHCR_PULL_TOKEN` | PAT com `read:packages` para o VPS puxar imagens (obrigatório se o package GHCR for privado) |

Se o pacote GHCR for **público**, `GHCR_PULL_TOKEN` ainda pode ser omitido no script (login opcional) — o workflow passa o token quando o secret existir.

### Variables (opcional)

| Variable | Default sugerido |
| --- | --- |
| `APP_DIR` | `/var/www/pokespace_backend` |
| `PROD_API_PORT` | `3000` |
| `STAGING_API_PORT` | `3001` |
| `DEPLOY_SSH_PORT` | `22` |

### Environment `production` (e `staging` para catalog sync)

1. Settings → Environments → New environment: `production`
2. Enable **Required reviewers** (1+ pessoa)
3. Crie também o environment `staging` (sem required reviewers) — usado pelo workflow Catalog sync
4. (Opcional) wait timer em `production`

### Branch protection (`main`)

- Require status check do workflow **CI** (job `test` / `docker`)
- Require PR before merge (recomendado)

### GHCR

No primeiro push bem-sucedido, o package `pokespace-api` aparece em Packages. Ajuste visibilidade (public/private) conforme preferência.

## Deploy manual (sem Actions)

```bash
export APP_DIR=/var/www/pokespace_backend
export COMPOSE_FILE=docker-compose.prod.yml
export COMPOSE_ENV_FILE=.env.production
export API_IMAGE=ghcr.io/victordasilvaf/pokespace-api:<sha>
export API_PORT=3000
# export GHCR_USER=VictordaSilvaf GHCR_TOKEN=...
./scripts/deploy/remote-deploy.sh
```

## Rollback

```bash
API_IMAGE=ghcr.io/victordasilvaf/pokespace-api:<sha-anterior> \
  APP_DIR=/var/www/pokespace_backend \
  COMPOSE_FILE=docker-compose.prod.yml \
  COMPOSE_ENV_FILE=.env.production \
  API_PORT=3000 \
  ./scripts/deploy/remote-deploy.sh
```

## Catalog sync

Via Actions: **Actions → Catalog sync → Run workflow** (staging ou production).

Via SSH:

```bash
APP_DIR=/var/www/pokespace_backend \
  COMPOSE_FILE=docker-compose.prod.yml \
  COMPOSE_ENV_FILE=.env.production \
  ./scripts/deploy/catalog-sync.sh
```

## Notas

- Nunca use `docker compose down -v` na esteira — apaga dados.
- Migrations rodam no **startup** da API (`MigrationRunner`).
- Staging não entra na rede do Caddy; use porta `3001` ou um vhost separado se quiser expor depois.
