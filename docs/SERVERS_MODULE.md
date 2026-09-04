# Módulo Server — playbook completo (v1)

Guia operacional para implementar o bounded context `server` neste repositório. O guia genérico continua em `[CREATING_A_MODULE.md](./CREATING_A_MODULE.md)`; aqui está o recorte **exato** da v1: catálogo de servidores (mundos), somente leitura, seed no SQL, duas rotas públicas.

O stub `src/modules/server/server.module.ts` **já existe**. Não recrie o arquivo — preencha-o no passo 10.

---

## 0. O que é o Server neste produto

Depois do login, o jogador escolhe (ou cria) um **personagem**. Personagem vive em um **mundo** (servidor). O módulo `server` é o catálogo desses servidores.

```
conta (identity)
  └── até 5 personagens (character — módulo seguinte)
        └── cada personagem pertence a 1 mundo (server — este módulo)
```



### v1 faz

- Listar mundos
- Buscar um mundo por id
- Persistir tabela `servers` + seed de 9 mundos (planetas)
- Expor o port `SERVER_REPOSITORY` e `GetServerUseCase` para o módulo `character` usar depois



### v1 não faz

- CRUD admin (criar/editar mundo pela API)
- Contagem de jogadores online
- Transferência de personagem entre mundos
- Party, inventory, battle, mapa, tiles
- Auth nas rotas de listagem (são públicas, como um seletor de servidor)



### Contratos HTTP da v1

Prefixo global já configurado em `src/main.ts`: `api/v1`.


| Método | Rota                 | Auth | Status         |
| ------ | -------------------- | ---- | -------------- |
| `GET`  | `/api/v1/servers`     | Não  | `200`          |
| `GET`  | `/api/v1/servers/:id` | Não  | `200` ou `404` |


Body de cada item:

```json
{
  "serverId": "11111111-1111-4111-8111-111111111111",
  "name": "Mercury",
  "region": "mercury",
  "status": "online",
  "maxPlayers": 1100
}
```

`status` permitido: `online` | `maintenance` | `offline`.

Regra de negócio para o **próximo** módulo: personagem só pode ser criado se `server.isJoinable()` (`status === 'online'`). Já implemente esse método no aggregate agora.

---



## 1. Pré-requisitos e ambiente

Raiz do repo: `pokespace_backend`.

```bash
cd /home/victorfernandes/Projetos/Victor/pokespace/pokespace_backend
```



### 1.1 Convenções obrigatórias deste projeto


| Convenção    | Detalhe                                                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| ESM          | `"type": "module"` no `package.json`. Todo import relativo termina em `.js` mesmo o arquivo sendo `.ts`.                      |
| Camadas      | `infrastructure` → `application` → `domain`. Domínio **não** importa Nest, `pg`, Redis, HTTP.                                 |
| DI           | Port no domínio = `interface` + `Symbol`. Adapter no Nest via `provide: SYMBOL`.                                              |
| Use case     | Implementa `UseCase<TInput, TOutput>` de `src/shared/application/use-case.ts`.                                                |
| Persistência | Sempre **Postgres + in-memory**. O driver in-memory liga com `USER_REPOSITORY_DRIVER=memory`.                                 |
| Migrations   | Arquivos em `migrations/*.sql`, ordenados por nome. Rodam no **startup** via `MigrationRunner` quando **não** está em memory. |
| Prefix       | Controllers usam path curto (`servers`). O prefixo `/api/v1` é global.                                                         |
| Testes       | Unitário: Vitest `*.spec.ts` ao lado do use case. E2E: `test/*.e2e-spec.ts`.                                                  |


Não use `nest g` para gerar o módulo inteiro — a árvore DDD não bate com o schematic padrão. Crie os arquivos na mão.

### 1.2 Stack local (Postgres)

O seed SQL só aparece quando a API sobe **sem** `USER_REPOSITORY_DRIVER=memory`.

```bash
# sobe Postgres (e o resto do compose, se quiser)
docker compose up -d postgres

# confira .env (já deve ter DATABASE_URL apontando para localhost)
# DATABASE_URL=postgresql://pokespace:pokespace@localhost:5432/pokespace

npm run start:dev
```

No log deve aparecer `applied migration: 003_create_servers.sql` na **primeira** subida após criar o arquivo. Subidas seguintes pulam o arquivo (tabela `schema_migrations`).

Para forçar reaplicar em **dev local** (apaga dados):

```bash
docker compose down -v postgres
docker compose up -d postgres
npm run start:dev
```

`-v` remove o volume `postgres_data`. Não use isso em ambiente compartilhado.

### 1.3 Comandos que você vai usar o tempo todo

```bash
# unitários (inclui **/*.spec.ts)
npm test

# um arquivo só
npx vitest run src/modules/server

# e2e (já seta USER_REPOSITORY_DRIVER=memory e REDIS_DRIVER=memory)
npm run test:e2e

# lint
npm run lint

# format
npm run format

# build TypeScript/Nest
npm run build
```

Smoke HTTP (depois do passo 11, API no ar):

```bash
curl -s http://localhost:3000/api/v1/servers | jq
curl -s http://localhost:3000/api/v1/servers/11111111-1111-4111-8111-111111111111 | jq
curl -i http://localhost:3000/api/v1/servers/00000000-0000-4000-8000-000000000000
# esperado: 404
```

Swagger: `http://localhost:3000/api/docs`.

---



## 2. Ordem de implementação (não pule)

Faça **nessa ordem**. Cada passo fecha um ciclo testável.


| #   | O quê                               | Como validar                            |
| --- | ----------------------------------- | --------------------------------------- |
| 0   | Bounded context (já definido acima) | —                                       |
| 1   | Pastas vazias                       | `find src/modules/server`                |
| 2   | Domain: errors, VOs, entity, port   | `npx tsc --noEmit` ou o spec do passo 6 |
| 3   | In-memory repository + seed         | instanciar no spec                      |
| 4   | Application DTOs + use cases        | spec unitário verde                     |
| 5   | Mapper + Postgres repository        | (ainda sem HTTP)                        |
| 6   | Migration `003`                     | startup com Postgres                    |
| 7   | Controller HTTP                     | curl / e2e                              |
| 8   | Preencher `server.module.ts`         | Nest sobe                               |
| 9   | Registrar no `AppModule`            | rotas existem                           |
| 10  | E2E + `docs/API_ROUTES.md`          | `npm run test:e2e`                      |


Não comece pelo controller. Sem use case + in-memory, o HTTP vira um saco de SQL.

---



## 3. Passo 1 — Estrutura de pastas

O módulo hoje:

```
src/modules/server/
└── server.module.ts
```

Crie **somente** estes caminhos (v1). Pastas `events/`, `application/ports/`, `infrastructure/adapters/` **não** existem nesta versão — não há criação de mundo pelo usuário, nem mailer/JWT.

```bash
cd src/modules/server

mkdir -p domain/entities \
         domain/value-objects \
         domain/repositories \
         domain/errors \
         application/dto \
         application/use-cases \
         infrastructure/http \
         infrastructure/persistence
```

Árvore alvo:

```
src/modules/server/
├── domain/
│   ├── entities/
│   │   └── server.entity.ts
│   ├── value-objects/
│   │   ├── server-name.vo.ts
│   │   └── server-status.vo.ts
│   ├── repositories/
│   │   └── server.repository.ts
│   └── errors/
│       └── server.errors.ts
├── application/
│   ├── dto/
│   │   └── server.dto.ts
│   └── use-cases/
│       ├── list-servers.use-case.ts
│       ├── list-servers.use-case.spec.ts
│       ├── get-server.use-case.ts
│       └── get-server.use-case.spec.ts
├── infrastructure/
│   ├── http/
│   │   └── server.controller.ts
│   └── persistence/
│       ├── seed-servers.ts
│       ├── server-row.mapper.ts
│       ├── in-memory-server.repository.ts
│       └── postgres-server.repository.ts
└── server.module.ts
```

Arquivos **fora** do módulo:

```
migrations/003_create_servers.sql
test/server.e2e-spec.ts
docs/API_ROUTES.md          # só acrescentar seção Server
src/app.module.ts           # import ServerModule
```

Não existe DTO de request com class-validator nesta v1: as rotas são GET sem body. Validação de `:id` usa `ParseUUIDPipe`.

---



## 4. Passo 2 — Domain: erros

Arquivo: `src/modules/server/domain/errors/server.errors.ts`

```typescript
export class ServerDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ServerNotFoundError extends ServerDomainError {
  constructor(serverId: string) {
    super(`Server not found: ${serverId}`);
  }
}

export class InvalidServerStatusError extends ServerDomainError {
  constructor(status: string) {
    super(`Invalid server status: ${status}`);
  }
}
```

O controller mapeia `ServerNotFoundError` → `404`. Os erros de VO (`ServerDomainError`) → `400` se algum dia um use case de escrita passar a existir.

Referência: `src/modules/identity/domain/errors/identity.errors.ts`.

---



## 5. Passo 3 — Domain: value objects



### 5.1 Nome

Arquivo: `src/modules/server/domain/value-objects/server-name.vo.ts`

```typescript
import { ValueObject } from '../../../../shared/domain/value-object.js';
import { ServerDomainError } from '../errors/server.errors.js';

interface ServerNameProps {
  value: string;
}

export class ServerName extends ValueObject<ServerNameProps> {
  private constructor(props: ServerNameProps) {
    super(props);
  }

  static create(raw: string): ServerName {
    const value = raw.trim();

    if (value.length < 3 || value.length > 50) {
      throw new ServerDomainError('Server name must be 3–50 characters');
    }

    return new ServerName({ value });
  }

  get value(): string {
    return this.props.value;
  }
}
```



### 5.2 Status

Arquivo: `src/modules/server/domain/value-objects/server-status.vo.ts`

```typescript
import { ValueObject } from '../../../../shared/domain/value-object.js';
import { InvalidServerStatusError } from '../errors/server.errors.js';

export const SERVER_STATUSES = ['online', 'maintenance', 'offline'] as const;

export type ServerStatusValue = (typeof SERVER_STATUSES)[number];

interface ServerStatusProps {
  value: ServerStatusValue;
}

export class ServerStatus extends ValueObject<ServerStatusProps> {
  private constructor(props: ServerStatusProps) {
    super(props);
  }

  static create(raw: string): ServerStatus {
    if (!SERVER_STATUSES.includes(raw as ServerStatusValue)) {
      throw new InvalidServerStatusError(raw);
    }

    return new ServerStatus({ value: raw as ServerStatusValue });
  }

  get value(): ServerStatusValue {
    return this.props.value;
  }

  isJoinable(): boolean {
    return this.props.value === 'online';
  }
}
```

`region` pode ficar como `string` no aggregate nesta v1 (catálogo interno). Se quiser VO depois (`mercury`, `venus`, …), extraia sem mudar o HTTP.

---



## 6. Passo 4 — Domain: aggregate `Server`

Arquivo: `src/modules/server/domain/entities/server.entity.ts`

Server é **catálogo**. Jogadores não criam mundos. Por isso:

- use `rehydrate()` (e um `seed()` interno só para o in-memory, se preferir)
- **não** precisa de `addDomainEvent` nesta v1
- ainda assim herde `AggregateRoot` — é o padrão do kernel e o `character` vai tratar Server como aggregate de outro contexto

```typescript
import { AggregateRoot } from '../../../../shared/domain/aggregate-root.js';
import { ServerName } from '../value-objects/server-name.vo.js';
import { ServerStatus } from '../value-objects/server-status.vo.js';
import { ServerDomainError } from '../errors/server.errors.js';

export interface ServerProps {
  id: string;
  name: ServerName;
  region: string;
  status: ServerStatus;
  maxPlayers: number;
  createdAt: Date;
}

export class Server extends AggregateRoot<string> {
  private constructor(
    id: string,
    private readonly _name: ServerName,
    private readonly _region: string,
    private readonly _status: ServerStatus,
    private readonly _maxPlayers: number,
    private readonly _createdAt: Date,
  ) {
    super(id);
  }

  static rehydrate(props: ServerProps): Server {
    if (props.maxPlayers < 1) {
      throw new ServerDomainError('maxPlayers must be >= 1');
    }

    const region = props.region.trim();
    if (region.length < 2 || region.length > 50) {
      throw new ServerDomainError('region must be 2–50 characters');
    }

    return new Server(
      props.id,
      props.name,
      region,
      props.status,
      props.maxPlayers,
      props.createdAt,
    );
  }

  get name(): ServerName {
    return this._name;
  }

  get region(): string {
    return this._region;
  }

  get status(): ServerStatus {
    return this._status;
  }

  get maxPlayers(): number {
    return this._maxPlayers;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  isJoinable(): boolean {
    return this._status.isJoinable();
  }
}
```

Não coloque `currentPlayers` no aggregate até existir uma fonte real (Redis/contador). Inventar `0` na API engana o cliente.

---



## 7. Passo 5 — Domain: port do repositório

Arquivo: `src/modules/server/domain/repositories/server.repository.ts`

v1 é read-only. **Não** declare `save` / `update` até existir admin.

```typescript
import type { Server } from '../entities/server.entity.js';

export const SERVER_REPOSITORY = Symbol('SERVER_REPOSITORY');

export interface ServerRepository {
  findById(id: string): Promise<Server | null>;
  list(): Promise<Server[]>;
}
```

O `Symbol` é o token de DI. Use cases injetam `@Inject(SERVER_REPOSITORY)`, nunca a classe Postgres.

Quando `character` nascer, ele **não** importa `PostgresServerRepository`. Ele importa `ServerModule` e injeta `SERVER_REPOSITORY` **ou** chama `GetServerUseCase`. Prefira o use case se a regra `isJoinable` ficar na application; prefira o port se o character só precisa hidratar o mundo. Na v1, **exporte os dois**.

---



## 8. Passo 6 — Seed compartilhado (in-memory = SQL)

Arquivo: `src/modules/server/infrastructure/persistence/seed-servers.ts`

UUIDs **fixos** (versão 4-looking, variant RFC). O e2e e o create de character vão hardcodar o mesmo id.

```typescript
import { Server } from '../../domain/entities/server.entity.js';
import { ServerName } from '../../domain/value-objects/server-name.vo.js';
import { ServerStatus } from '../../domain/value-objects/server-status.vo.js';

export const SEEDED_SERVER_IDS = {
  mercury: '11111111-1111-4111-8111-111111111111',
  venus: '22222222-2222-4222-8222-222222222222',
  earth: '33333333-3333-4333-8333-333333333333',
  mars: '44444444-4444-4444-8444-444444444444',
  jupiter: '55555555-5555-5555-8555-555555555555',
  saturn: '66666666-6666-6666-8666-666666666666',
  uranus: '77777777-7777-7777-8777-777777777777',
  neptune: '88888888-8888-8888-8888-888888888888',
  pluto: '99999999-9999-9999-8999-999999999999',
} as const;

export function createSeedServers(): Server[] {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');

  // 9 mundos: Mercury…Pluto (Earth em maintenance; demais online)
  // maxPlayers: 1100; region = slug do planeta (ex.: 'earth')
  return [
    /* …Server.rehydrate para cada entrada de SEEDED_SERVER_IDS… */
  ];
}
```

O in-memory **deve** nascer com esses 9 mundos (espelhando o `INSERT` da migration). Sem seed, o e2e em memory retorna `[]` e o Postgres retorna 9 linhas — testes quebram conforme o driver.

---



## 9. Passo 7 — Application: DTOs

Arquivo: `src/modules/server/application/dto/server.dto.ts`

Não use class-validator aqui. São tipos da application, não HTTP.

```typescript
import type { ServerStatusValue } from '../../domain/value-objects/server-status.vo.js';

export interface GetServerQuery {
  serverId: string;
}

export interface ServerResult {
  serverId: string;
  name: string;
  region: string;
  status: ServerStatusValue;
  maxPlayers: number;
}

export type ListServersResult = ServerResult[];
```

Mapper de aggregate → result (pode ficar no use case ou num helper no mesmo arquivo):

```typescript
import type { Server } from '../../domain/entities/server.entity.js';

export function toServerResult(server: Server): ServerResult {
  return {
    serverId: server.id,
    name: server.name.value,
    region: server.region,
    status: server.status.value,
    maxPlayers: server.maxPlayers,
  };
}
```

---



## 10. Passo 8 — Application: use cases

Use cases **podem** usar `@Injectable()` — application orquestra I/O. Domain não.

### 10.1 Listar

Arquivo: `src/modules/server/application/use-cases/list-servers.use-case.ts`

```typescript
import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  SERVER_REPOSITORY,
  type ServerRepository,
} from '../../domain/repositories/server.repository.js';
import { toServerResult, type ListServersResult } from '../dto/server.dto.js';

@Injectable()
export class ListServersUseCase implements UseCase<void, ListServersResult> {
  constructor(
    @Inject(SERVER_REPOSITORY)
    private readonly servers: ServerRepository,
  ) {}

  async execute(): Promise<ListServersResult> {
    const list = await this.servers.list();
    return list.map(toServerResult);
  }
}
```

`UseCase<void, …>`: chame `execute()` sem argumento no controller.

### 10.2 Buscar um

Arquivo: `src/modules/server/application/use-cases/get-server.use-case.ts`

```typescript
import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  SERVER_REPOSITORY,
  type ServerRepository,
} from '../../domain/repositories/server.repository.js';
import { ServerNotFoundError } from '../../domain/errors/server.errors.js';
import {
  toServerResult,
  type GetServerQuery,
  type ServerResult,
} from '../dto/server.dto.js';

@Injectable()
export class GetServerUseCase implements UseCase<GetServerQuery, ServerResult> {
  constructor(
    @Inject(SERVER_REPOSITORY)
    private readonly servers: ServerRepository,
  ) {}

  async execute(query: GetServerQuery): Promise<ServerResult> {
    const server = await this.servers.findById(query.serverId);
    if (!server) {
      throw new ServerNotFoundError(query.serverId);
    }

    return toServerResult(server);
  }
}
```

Não filtre `offline` na listagem nesta v1 — o cliente mostra “em manutenção”. O filtro de criação fica no `character`.

### 10.3 Testes unitários (escreva **antes** do HTTP)

Arquivo: `src/modules/server/application/use-cases/list-servers.use-case.spec.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { ListServersUseCase } from './list-servers.use-case.js';
import { InMemoryServerRepository } from '../../infrastructure/persistence/in-memory-server.repository.js';
import { SEEDED_SERVER_IDS } from '../../infrastructure/persistence/seed-servers.js';

describe('ListServersUseCase', () => {
  it('returns the seeded servers', async () => {
    const useCase = new ListServersUseCase(new InMemoryServerRepository());
    const result = await useCase.execute();

    expect(result).toHaveLength(9);
    // list() ordena por status (online primeiro), depois name ASC
    expect(result.map((w) => w.serverId)).toEqual([
      SEEDED_SERVER_IDS.jupiter,
      SEEDED_SERVER_IDS.mars,
      SEEDED_SERVER_IDS.mercury,
      SEEDED_SERVER_IDS.neptune,
      SEEDED_SERVER_IDS.pluto,
      SEEDED_SERVER_IDS.saturn,
      SEEDED_SERVER_IDS.uranus,
      SEEDED_SERVER_IDS.venus,
      SEEDED_SERVER_IDS.earth,
    ]);

    const earth = result.find((w) => w.name === 'Earth');
    expect(earth).toBeDefined();
    expect(earth?.status).toBe('maintenance');
  });
});
```

Arquivo: `src/modules/server/application/use-cases/get-server.use-case.spec.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { GetServerUseCase } from './get-server.use-case.js';
import { InMemoryServerRepository } from '../../infrastructure/persistence/in-memory-server.repository.js';
import { SEEDED_SERVER_IDS } from '../../infrastructure/persistence/seed-servers.js';
import { ServerNotFoundError } from '../../domain/errors/server.errors.js';

describe('GetServerUseCase', () => {
  it('returns a seeded server by id', async () => {
    const useCase = new GetServerUseCase(new InMemoryServerRepository());
    const result = await useCase.execute({
      serverId: SEEDED_SERVER_IDS.earth,
    });

    expect(result.name).toBe('Earth');
    expect(result.status).toBe('maintenance');
  });

  it('throws ServerNotFoundError for unknown id', async () => {
    const useCase = new GetServerUseCase(new InMemoryServerRepository());

    await expect(
      useCase.execute({
        serverId: '00000000-0000-4000-8000-000000000000',
      }),
    ).rejects.toBeInstanceOf(ServerNotFoundError);
  });
});
```

Rode assim que o in-memory existir:

```bash
npx vitest run src/modules/server/application/use-cases
```

Padrão: **instancie o use case com** `new`, sem `Test.createTestingModule`, igual a maior parte dos specs de identity (exceto os que precisam de JwtModule).

---



## 11. Passo 9 — Infrastructure: persistência



### 11.1 Mapper Postgres ↔ domínio

Arquivo: `src/modules/server/infrastructure/persistence/server-row.mapper.ts`

```typescript
import { Server } from '../../domain/entities/server.entity.js';
import { ServerName } from '../../domain/value-objects/server-name.vo.js';
import { ServerStatus } from '../../domain/value-objects/server-status.vo.js';

export const SERVER_SELECTED_COLUMNS =
  'id, name, region, status, max_players, created_at';

export interface ServerRow {
  id: string;
  name: string;
  region: string;
  status: string;
  max_players: number;
  created_at: Date;
}

export function mapRowToServer(row: ServerRow): Server {
  return Server.rehydrate({
    id: row.id,
    name: ServerName.create(row.name),
    region: row.region,
    status: ServerStatus.create(row.status),
    maxPlayers: row.max_players,
    createdAt: row.created_at,
  });
}
```

`pg` devolve `int` como `number` e `timestamptz` como `Date` com o driver padrão. Se algum teste quebrar com string, faça `new Date(row.created_at)`.

### 11.2 In-memory

Arquivo: `src/modules/server/infrastructure/persistence/in-memory-server.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import type { ServerRepository } from '../../domain/repositories/server.repository.js';
import type { Server } from '../../domain/entities/server.entity.js';
import { createSeedServers } from './seed-servers.js';

@Injectable()
export class InMemoryServerRepository implements ServerRepository {
  private readonly byId = new Map<string, Server>();

  constructor() {
    for (const server of createSeedServers()) {
      this.byId.set(server.id, server);
    }
  }

  async findById(id: string): Promise<Server | null> {
    return this.byId.get(id) ?? null;
  }

  async list(): Promise<Server[]> {
    return [...this.byId.values()];
  }
}
```



### 11.3 Postgres

Arquivo: `src/modules/server/infrastructure/persistence/postgres-server.repository.ts`

```typescript
import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../../../../shared/infrastructure/database/database.pool.port.js';
import type { ServerRepository } from '../../domain/repositories/server.repository.js';
import type { Server } from '../../domain/entities/server.entity.js';
import {
  mapRowToServer,
  SERVER_SELECTED_COLUMNS,
  type ServerRow,
} from './server-row.mapper.js';

@Injectable()
export class PostgresServerRepository implements ServerRepository {
  constructor(
    @Inject(DATABASE_POOL)
    private readonly pool: Pool,
  ) {}

  async findById(id: string): Promise<Server | null> {
    const result = await this.pool.query<ServerRow>(
      `SELECT ${SERVER_SELECTED_COLUMNS} FROM servers WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapRowToServer(row) : null;
  }

  async list(): Promise<Server[]> {
    const result = await this.pool.query<ServerRow>(
      `SELECT ${SERVER_SELECTED_COLUMNS} FROM servers
       ORDER BY
         CASE status
           WHEN 'online' THEN 0
           WHEN 'maintenance' THEN 1
           WHEN 'offline' THEN 2
           ELSE 3
         END ASC,
         name ASC`,
    );
    return result.rows.map(mapRowToServer);
  }
}
```

Ordenação: Postgres e in-memory **ambos** ordenam por status (`online` → `maintenance` → `offline`) e, em empate, por `name ASC`.

```typescript
async list(): Promise<Server[]> {
  const statusRank: Record<string, number> = {
    online: 0,
    maintenance: 1,
    offline: 2,
  };

  return [...this.byId.values()].sort((a, b) => {
    const byStatus =
      (statusRank[a.status.value] ?? 99) - (statusRank[b.status.value] ?? 99);
    if (byStatus !== 0) {
      return byStatus;
    }
    return a.name.value.localeCompare(b.name.value);
  });
}
```

No spec de listagem, os online vêm primeiro (Jupiter…Venus) e Earth (`maintenance`) por último.

---



## 12. Passo 10 — Migration SQL

Arquivo: `migrations/003_create_servers.sql`

O runner (`src/shared/infrastructure/database/migration.runner.ts`):

1. Lê `migrations/*.sql` em ordem lexicográfica
2. Pula ids já em `schema_migrations`
3. Roda o arquivo **inteiro** numa transação

Por isso o `INSERT` do seed **vai no mesmo arquivo** da `CREATE TABLE`. Se separar `003` (schema) e `004` (seed), também funciona — mas um arquivo só é suficiente para v1.

**Não** use `001` ou `002`: já existem (`identity`).

```sql
CREATE TABLE IF NOT EXISTS servers (
  id UUID PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  region VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'online',
  max_players INT NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_servers_name UNIQUE (name),
  CONSTRAINT ck_servers_status CHECK (status IN ('online', 'maintenance', 'offline')),
  CONSTRAINT ck_servers_max_players CHECK (max_players >= 1)
);

INSERT INTO servers (id, name, region, status, max_players, created_at)
VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'Mercury',
    'mercury',
    'online',
    1100,
    '2026-01-01T00:00:00Z'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Venus',
    'venus',
    'online',
    1100,
    '2026-01-01T00:00:00Z'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'Earth',
    'earth',
    'maintenance',
    1100,
    '2026-01-01T00:00:00Z'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'Mars',
    'mars',
    'online',
    1100,
    '2026-01-01T00:00:00Z'
  ),
  (
    '55555555-5555-5555-8555-555555555555',
    'Jupiter',
    'jupiter',
    'online',
    1100,
    '2026-01-01T00:00:00Z'
  ),
  (
    '66666666-6666-6666-8666-666666666666',
    'Saturn',
    'saturn',
    'online',
    1100,
    '2026-01-01T00:00:00Z'
  ),
  (
    '77777777-7777-7777-8777-777777777777',
    'Uranus',
    'uranus',
    'online',
    1100,
    '2026-01-01T00:00:00Z'
  ),
  (
    '88888888-8888-8888-8888-888888888888',
    'Neptune',
    'neptune',
    'online',
    1100,
    '2026-01-01T00:00:00Z'
  ),
  (
    '99999999-9999-9999-8999-999999999999',
    'Pluto',
    'pluto',
    'online',
    1100,
    '2026-01-01T00:00:00Z'
  )
ON CONFLICT (id) DO NOTHING;
```

`ON CONFLICT (id) DO NOTHING` deixa o INSERT idempotente se alguém reexecutar o SQL na mão. O runner em si não reexecuta o arquivo.

Conferir no banco depois do `start:dev`:

```bash
docker compose exec postgres \
  psql -U pokespace -d pokespace \
  -c 'SELECT id, name, status FROM servers ORDER BY name;'

docker compose exec postgres \
  psql -U pokespace -d pokespace \
  -c "SELECT id FROM schema_migrations WHERE id LIKE '003%';"
```

---



## 13. Passo 11 — Infrastructure: HTTP

Arquivo: `src/modules/server/infrastructure/http/server.controller.ts`

Controller **fino**: valida UUID, chama use case, mapeia erro de domínio.

Não use `AuthGuard`. Não importe nada de `identity`.

```typescript
import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListServersUseCase } from '../../application/use-cases/list-servers.use-case.js';
import { GetServerUseCase } from '../../application/use-cases/get-server.use-case.js';
import {
  ServerDomainError,
  ServerNotFoundError,
} from '../../domain/errors/server.errors.js';

@ApiTags('servers')
@Controller('servers')
export class ServerController {
  constructor(
    private readonly listServers: ListServersUseCase,
    private readonly getServer: GetServerUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List game servers (servers)' })
  async list() {
    return this.listServers.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a server by id' })
  async getById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    try {
      return await this.getServer.execute({ serverId: id });
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  private mapDomainError(error: unknown): never {
    if (error instanceof ServerNotFoundError) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof ServerDomainError) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
```

`ParseUUIDPipe` devolve **400** se `:id` não for UUID v4 — não chega no use case. Os ids de seed acima são UUID v4 válidos (`4` na 13ª posição).

Não coloque `@UseGuards(ThrottlerGuard)` no controller: o guard já é global no `AppModule`.

---



## 14. Passo 12 — NestJS Module (wiring)

Arquivo: `src/modules/server/server.module.ts` (já existe — substitua o conteúdo)

```typescript
import { Module } from '@nestjs/common';
import type { Pool } from 'pg';
import {
  DATABASE_POOL,
  useInMemoryUserRepository,
} from '../../shared/infrastructure/database/database.pool.port.js';
import { SERVER_REPOSITORY } from './domain/repositories/server.repository.js';
import { ListServersUseCase } from './application/use-cases/list-servers.use-case.js';
import { GetServerUseCase } from './application/use-cases/get-server.use-case.js';
import { ServerController } from './infrastructure/http/server.controller.js';
import { InMemoryServerRepository } from './infrastructure/persistence/in-memory-server.repository.js';
import { PostgresServerRepository } from './infrastructure/persistence/postgres-server.repository.js';

@Module({
  imports: [],
  controllers: [ServerController],
  providers: [
    ListServersUseCase,
    GetServerUseCase,
    {
      provide: SERVER_REPOSITORY,
      useFactory: (pool: Pool | null) => {
        if (useInMemoryUserRepository() || !pool) {
          return new InMemoryServerRepository();
        }

        return new PostgresServerRepository(pool);
      },
      inject: [DATABASE_POOL],
    },
  ],
  exports: [SERVER_REPOSITORY, ListServersUseCase, GetServerUseCase],
})
export class ServerModule {}
```

Pontos importantes:

- `useInMemoryUserRepository()` é o **mesmo** flag de identity (`USER_REPOSITORY_DRIVER=memory`). Não invente `SERVER_REPOSITORY_DRIVER` nesta v1 — o e2e já seta esse env em `vitest.config.e2e.ts`.
- `DATABASE_POOL` vem do `SharedModule` (`@Global()`). Não precisa importar `SharedModule` de novo.
- **Não** importe `IdentityModule`. Rotas públicas.
- `exports` existem para o módulo `character` no futuro.

---



## 15. Passo 13 — Registrar no AppModule

Arquivo: `src/app.module.ts`

Adicione o import ESM e a entrada no array `imports`:

```typescript
import { ServerModule } from './modules/server/server.module.js';
```

```typescript
imports: [
  // ConfigModule, ThrottlerModule, ObserveModule, SharedModule, IdentityModule
  ServerModule,
],
```

Ordem sugerida: `SharedModule`, `IdentityModule`, `ServerModule`. Server não depende de Identity.

---



## 16. Passo 14 — Teste e2e

Arquivo: `test/server.e2e-spec.ts`

Copie o bootstrap de `test/app.e2e-spec.ts` (ValidationPipe, prefix, memory drivers). Não compartilhe `app` entre arquivos — cada spec cria o próprio.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { SEEDED_SERVER_IDS } from '../src/modules/server/infrastructure/persistence/seed-servers.js';

describe('Server (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.USER_REPOSITORY_DRIVER = 'memory';
    process.env.REDIS_DRIVER = 'memory';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/v1/servers returns seeded servers', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/servers')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(9);
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        serverId: expect.any(String),
        name: expect.any(String),
        region: expect.any(String),
        status: expect.stringMatching(/^(online|maintenance|offline)$/),
        maxPlayers: expect.any(Number),
      }),
    );
  });

  it('GET /api/v1/servers/:id returns one server', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/servers/${SEEDED_SERVER_IDS.earth}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.name).toBe('Earth');
        expect(body.status).toBe('maintenance');
      });
  });

  it('GET /api/v1/servers/:id returns 404 when missing', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/servers/00000000-0000-4000-8000-000000000000')
      .expect(404);
  });

  it('GET /api/v1/servers/:id returns 400 for invalid uuid', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/servers/not-a-uuid')
      .expect(400);
  });
});
```

```bash
npm run test:e2e
```

Se o e2e de server falhar com “ServerModule is not part of AppModule”, você esqueceu o passo 13.

---



## 17. Passo 15 — Documentar rotas

Em `[docs/API_ROUTES.md](./API_ROUTES.md)`:

1. Inclua duas linhas na tabela **Visão geral**.
2. Crie a seção **Server** no final (antes de qualquer seção Character, que ainda não existe).

Texto sugerido:

```markdown
| `GET` | `/api/v1/servers` | Não | Lista mundos (servidores) |
| `GET` | `/api/v1/servers/:id` | Não | Detalhe de um mundo |

## Server

Catálogo de servidores. Somente leitura. Seed via migration `003_create_servers.sql` (9 mundos: Mercury…Pluto).

### `GET /api/v1/servers`

**Auth:** não

**Response `200`:** array ordenado por status (`online` → `maintenance` → `offline`), depois `name` ASC

```json
{
  "serverId": "uuid",
  "name": "Mercury",
  "region": "mercury",
  "status": "online",
  "maxPlayers": 1100
}
```

`status`: `online` | `maintenance` | `offline`.

### `GET /api/v1/servers/:id`

**Auth:** não

**Response** `200`**:** mesmo objeto.

**Response** `400`**:** `:id` não é UUID v4.

**Response** `404`**:** mundo inexistente.

```

---
```

## 18. Checklist de fechamento

```
[ ] Árvore domain / application / infrastructure criada
[ ] server.errors.ts + VOs + Server.rehydrate + isJoinable()
[ ] SERVER_REPOSITORY (Symbol + interface read-only)
[ ] seed-servers.ts com 9 UUIDs fixos (planetas)
[ ] InMemoryServerRepository já nasce com o seed
[ ] PostgresServerRepository + mapper
[ ] ListServersUseCase + GetServerUseCase
[ ] Specs unitários verdes (npm test)
[ ] migrations/003_create_servers.sql (DDL + INSERT)
[ ] ServerController público + ParseUUIDPipe + mapDomainError
[ ] server.module.ts factory memory/postgres
[ ] AppModule importa ServerModule
[ ] test/server.e2e-spec.ts verde
[ ] docs/API_ROUTES.md atualizado
[ ] curl local com Postgres (opcional, mas recomendado)
[ ] npm run lint sem erro novo
```

---

## 19. Como o Character vai consumir isso (não implemente agora)

Quando o módulo `character` existir:

```typescript
// character.module.ts
imports: [ServerModule, IdentityModule],
```

No `CreateCharacterUseCase`:

```typescript
const server = await this.getServer.execute({ serverId: command.serverId });
// ou injete SERVER_REPOSITORY e chame findById

if (server.status !== 'online') {
  throw new ServerNotJoinableError(server.serverId);
}
```

Se usar o port em vez do use case, chame `server.isJoinable()` no aggregate — a regra fica no domínio de Server, não duplicada em Character.

Nickname único **por mundo** = unique `(server_id, nickname)` na tabela `characters`, não neste módulo.

---

## 20. Anti-patterns específicos deste módulo


| Não faça                                        | Por quê                                                                                                                                                                                                   |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /servers` na v1                            | Sem admin, sem auth de staff                                                                                                                                                                              |
| Importar `PostgresServerRepository` no Character | Quebra o bounded context                                                                                                                                                                                  |
| Colocar SQL no controller                       | Regra e persistência grudadas no HTTP                                                                                                                                                                     |
| `@Injectable()` na entity `Server`               | Domínio puro                                                                                                                                                                                              |
| Esquecer o seed no in-memory                    | E2E memory ≠ Postgres                                                                                                                                                                                     |
| `currentPlayers` fake                           | Contrato mentiroso                                                                                                                                                                                        |
| Novo env `SERVER_DRIVER`                         | E2E e identity já usam `USER_REPOSITORY_DRIVER`                                                                                                                                                           |
| Import relativo sem `.js`                       | ESM quebra no runtime Nest                                                                                                                                                                                |
| Recriar `001_*.sql`                             | Colide com identity                                                                                                                                                                                       |
| AuthGuard nas rotas de catálogo                 | Tela de seleção de servidor precisa listar mundos após login **e** o create também precisa do id; listagem pública simplifica. Se no futuro quiser “só logado vê”, adicione o guard sem mudar o use case. |


---

## 21. Mapa de arquivos × responsabilidade


| Arquivo                         | Camada         | Pode importar Nest?            | Pode importar `pg`?      |
| ------------------------------- | -------------- | ------------------------------ | ------------------------ |
| `domain/**`                     | domain         | Não                            | Não                      |
| `application/dto/**`            | application    | Não                            | Não                      |
| `application/use-cases/*.ts`    | application    | Sim (`@Injectable`, `@Inject`) | Não                      |
| `infrastructure/persistence/**` | infrastructure | Sim                            | Sim (só o Postgres repo) |
| `infrastructure/http/**`        | infrastructure | Sim                            | Não                      |
| `server.module.ts`               | composition    | Sim                            | Só o tipo `Pool`         |


---

## 22. Referências no repo


| O quê                           | Onde                                                       |
| ------------------------------- | ---------------------------------------------------------- |
| Módulo de referência (completo) | `src/modules/identity/`                                    |
| Factory memory/postgres         | `src/modules/identity/identity.module.ts`                  |
| Migration runner                | `src/shared/infrastructure/database/migration.runner.ts`   |
| Flag memory                     | `src/shared/infrastructure/database/database.pool.port.ts` |
| UseCase                         | `src/shared/application/use-case.ts`                       |
| AggregateRoot                   | `src/shared/domain/aggregate-root.ts`                      |
| E2E bootstrap                   | `test/app.e2e-spec.ts`                                     |
| Env e2e                         | `vitest.config.e2e.ts`                                     |
| Guia genérico                   | `docs/CREATING_A_MODULE.md`                                |
| Arquitetura                     | `docs/ARCHITECTURE.md`                                     |


---

## 23. Sequência de commits sugerida (opcional)

Se quiser PRs pequenos:

1. Domain + in-memory + use cases + specs
2. Migration + Postgres repo + module wiring + HTTP
3. E2E + `API_ROUTES.md`

Não precisa commitar até você pedir.