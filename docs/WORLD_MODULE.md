# Módulo World — playbook completo (v1)

Guia operacional para implementar o bounded context `world` neste repositório. O guia genérico continua em `[CREATING_A_MODULE.md](./CREATING_A_MODULE.md)`; aqui está o recorte **exato** da v1: catálogo de servidores (mundos), somente leitura, seed no SQL, duas rotas públicas.

O stub `src/modules/world/world.module.ts` **já existe**. Não recrie o arquivo — preencha-o no passo 10.

---

## 0. O que é o World neste produto

Depois do login, o jogador escolhe (ou cria) um **personagem**. Personagem vive em um **mundo** (servidor). O módulo `world` é o catálogo desses servidores.

```
conta (identity)
  └── até 5 personagens (character — módulo seguinte)
        └── cada personagem pertence a 1 mundo (world — este módulo)
```



### v1 faz

- Listar mundos
- Buscar um mundo por id
- Persistir tabela `worlds` + seed de 9 mundos (planetas)
- Expor o port `WORLD_REPOSITORY` e `GetWorldUseCase` para o módulo `character` usar depois



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
| `GET`  | `/api/v1/worlds`     | Não  | `200`          |
| `GET`  | `/api/v1/worlds/:id` | Não  | `200` ou `404` |


Body de cada item:

```json
{
  "worldId": "11111111-1111-4111-8111-111111111111",
  "name": "Mercury",
  "region": "mercury",
  "status": "online",
  "maxPlayers": 1100
}
```

`status` permitido: `online` | `maintenance` | `offline`.

Regra de negócio para o **próximo** módulo: personagem só pode ser criado se `world.isJoinable()` (`status === 'online'`). Já implemente esse método no aggregate agora.

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
| Prefix       | Controllers usam path curto (`worlds`). O prefixo `/api/v1` é global.                                                         |
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

No log deve aparecer `applied migration: 003_create_worlds.sql` na **primeira** subida após criar o arquivo. Subidas seguintes pulam o arquivo (tabela `schema_migrations`).

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
npx vitest run src/modules/world

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
curl -s http://localhost:3000/api/v1/worlds | jq
curl -s http://localhost:3000/api/v1/worlds/11111111-1111-4111-8111-111111111111 | jq
curl -i http://localhost:3000/api/v1/worlds/00000000-0000-4000-8000-000000000000
# esperado: 404
```

Swagger: `http://localhost:3000/api/docs`.

---



## 2. Ordem de implementação (não pule)

Faça **nessa ordem**. Cada passo fecha um ciclo testável.


| #   | O quê                               | Como validar                            |
| --- | ----------------------------------- | --------------------------------------- |
| 0   | Bounded context (já definido acima) | —                                       |
| 1   | Pastas vazias                       | `find src/modules/world`                |
| 2   | Domain: errors, VOs, entity, port   | `npx tsc --noEmit` ou o spec do passo 6 |
| 3   | In-memory repository + seed         | instanciar no spec                      |
| 4   | Application DTOs + use cases        | spec unitário verde                     |
| 5   | Mapper + Postgres repository        | (ainda sem HTTP)                        |
| 6   | Migration `003`                     | startup com Postgres                    |
| 7   | Controller HTTP                     | curl / e2e                              |
| 8   | Preencher `world.module.ts`         | Nest sobe                               |
| 9   | Registrar no `AppModule`            | rotas existem                           |
| 10  | E2E + `docs/API_ROUTES.md`          | `npm run test:e2e`                      |


Não comece pelo controller. Sem use case + in-memory, o HTTP vira um saco de SQL.

---



## 3. Passo 1 — Estrutura de pastas

O módulo hoje:

```
src/modules/world/
└── world.module.ts
```

Crie **somente** estes caminhos (v1). Pastas `events/`, `application/ports/`, `infrastructure/adapters/` **não** existem nesta versão — não há criação de mundo pelo usuário, nem mailer/JWT.

```bash
cd src/modules/world

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
src/modules/world/
├── domain/
│   ├── entities/
│   │   └── world.entity.ts
│   ├── value-objects/
│   │   ├── world-name.vo.ts
│   │   └── world-status.vo.ts
│   ├── repositories/
│   │   └── world.repository.ts
│   └── errors/
│       └── world.errors.ts
├── application/
│   ├── dto/
│   │   └── world.dto.ts
│   └── use-cases/
│       ├── list-worlds.use-case.ts
│       ├── list-worlds.use-case.spec.ts
│       ├── get-world.use-case.ts
│       └── get-world.use-case.spec.ts
├── infrastructure/
│   ├── http/
│   │   └── world.controller.ts
│   └── persistence/
│       ├── seed-worlds.ts
│       ├── world-row.mapper.ts
│       ├── in-memory-world.repository.ts
│       └── postgres-world.repository.ts
└── world.module.ts
```

Arquivos **fora** do módulo:

```
migrations/003_create_worlds.sql
test/world.e2e-spec.ts
docs/API_ROUTES.md          # só acrescentar seção World
src/app.module.ts           # import WorldModule
```

Não existe DTO de request com class-validator nesta v1: as rotas são GET sem body. Validação de `:id` usa `ParseUUIDPipe`.

---



## 4. Passo 2 — Domain: erros

Arquivo: `src/modules/world/domain/errors/world.errors.ts`

```typescript
export class WorldDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class WorldNotFoundError extends WorldDomainError {
  constructor(worldId: string) {
    super(`World not found: ${worldId}`);
  }
}

export class InvalidWorldStatusError extends WorldDomainError {
  constructor(status: string) {
    super(`Invalid world status: ${status}`);
  }
}
```

O controller mapeia `WorldNotFoundError` → `404`. Os erros de VO (`WorldDomainError`) → `400` se algum dia um use case de escrita passar a existir.

Referência: `src/modules/identity/domain/errors/identity.errors.ts`.

---



## 5. Passo 3 — Domain: value objects



### 5.1 Nome

Arquivo: `src/modules/world/domain/value-objects/world-name.vo.ts`

```typescript
import { ValueObject } from '../../../../shared/domain/value-object.js';
import { WorldDomainError } from '../errors/world.errors.js';

interface WorldNameProps {
  value: string;
}

export class WorldName extends ValueObject<WorldNameProps> {
  private constructor(props: WorldNameProps) {
    super(props);
  }

  static create(raw: string): WorldName {
    const value = raw.trim();

    if (value.length < 3 || value.length > 50) {
      throw new WorldDomainError('World name must be 3–50 characters');
    }

    return new WorldName({ value });
  }

  get value(): string {
    return this.props.value;
  }
}
```



### 5.2 Status

Arquivo: `src/modules/world/domain/value-objects/world-status.vo.ts`

```typescript
import { ValueObject } from '../../../../shared/domain/value-object.js';
import { InvalidWorldStatusError } from '../errors/world.errors.js';

export const WORLD_STATUSES = ['online', 'maintenance', 'offline'] as const;

export type WorldStatusValue = (typeof WORLD_STATUSES)[number];

interface WorldStatusProps {
  value: WorldStatusValue;
}

export class WorldStatus extends ValueObject<WorldStatusProps> {
  private constructor(props: WorldStatusProps) {
    super(props);
  }

  static create(raw: string): WorldStatus {
    if (!WORLD_STATUSES.includes(raw as WorldStatusValue)) {
      throw new InvalidWorldStatusError(raw);
    }

    return new WorldStatus({ value: raw as WorldStatusValue });
  }

  get value(): WorldStatusValue {
    return this.props.value;
  }

  isJoinable(): boolean {
    return this.props.value === 'online';
  }
}
```

`region` pode ficar como `string` no aggregate nesta v1 (catálogo interno). Se quiser VO depois (`mercury`, `venus`, …), extraia sem mudar o HTTP.

---



## 6. Passo 4 — Domain: aggregate `World`

Arquivo: `src/modules/world/domain/entities/world.entity.ts`

World é **catálogo**. Jogadores não criam mundos. Por isso:

- use `rehydrate()` (e um `seed()` interno só para o in-memory, se preferir)
- **não** precisa de `addDomainEvent` nesta v1
- ainda assim herde `AggregateRoot` — é o padrão do kernel e o `character` vai tratar World como aggregate de outro contexto

```typescript
import { AggregateRoot } from '../../../../shared/domain/aggregate-root.js';
import { WorldName } from '../value-objects/world-name.vo.js';
import { WorldStatus } from '../value-objects/world-status.vo.js';
import { WorldDomainError } from '../errors/world.errors.js';

export interface WorldProps {
  id: string;
  name: WorldName;
  region: string;
  status: WorldStatus;
  maxPlayers: number;
  createdAt: Date;
}

export class World extends AggregateRoot<string> {
  private constructor(
    id: string,
    private readonly _name: WorldName,
    private readonly _region: string,
    private readonly _status: WorldStatus,
    private readonly _maxPlayers: number,
    private readonly _createdAt: Date,
  ) {
    super(id);
  }

  static rehydrate(props: WorldProps): World {
    if (props.maxPlayers < 1) {
      throw new WorldDomainError('maxPlayers must be >= 1');
    }

    const region = props.region.trim();
    if (region.length < 2 || region.length > 50) {
      throw new WorldDomainError('region must be 2–50 characters');
    }

    return new World(
      props.id,
      props.name,
      region,
      props.status,
      props.maxPlayers,
      props.createdAt,
    );
  }

  get name(): WorldName {
    return this._name;
  }

  get region(): string {
    return this._region;
  }

  get status(): WorldStatus {
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

Arquivo: `src/modules/world/domain/repositories/world.repository.ts`

v1 é read-only. **Não** declare `save` / `update` até existir admin.

```typescript
import type { World } from '../entities/world.entity.js';

export const WORLD_REPOSITORY = Symbol('WORLD_REPOSITORY');

export interface WorldRepository {
  findById(id: string): Promise<World | null>;
  list(): Promise<World[]>;
}
```

O `Symbol` é o token de DI. Use cases injetam `@Inject(WORLD_REPOSITORY)`, nunca a classe Postgres.

Quando `character` nascer, ele **não** importa `PostgresWorldRepository`. Ele importa `WorldModule` e injeta `WORLD_REPOSITORY` **ou** chama `GetWorldUseCase`. Prefira o use case se a regra `isJoinable` ficar na application; prefira o port se o character só precisa hidratar o mundo. Na v1, **exporte os dois**.

---



## 8. Passo 6 — Seed compartilhado (in-memory = SQL)

Arquivo: `src/modules/world/infrastructure/persistence/seed-worlds.ts`

UUIDs **fixos** (versão 4-looking, variant RFC). O e2e e o create de character vão hardcodar o mesmo id.

```typescript
import { World } from '../../domain/entities/world.entity.js';
import { WorldName } from '../../domain/value-objects/world-name.vo.js';
import { WorldStatus } from '../../domain/value-objects/world-status.vo.js';

export const SEEDED_WORLD_IDS = {
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

export function createSeedWorlds(): World[] {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');

  // 9 mundos: Mercury…Pluto (Earth em maintenance; demais online)
  // maxPlayers: 1100; region = slug do planeta (ex.: 'earth')
  return [
    /* …World.rehydrate para cada entrada de SEEDED_WORLD_IDS… */
  ];
}
```

O in-memory **deve** nascer com esses 9 mundos (espelhando o `INSERT` da migration). Sem seed, o e2e em memory retorna `[]` e o Postgres retorna 9 linhas — testes quebram conforme o driver.

---



## 9. Passo 7 — Application: DTOs

Arquivo: `src/modules/world/application/dto/world.dto.ts`

Não use class-validator aqui. São tipos da application, não HTTP.

```typescript
import type { WorldStatusValue } from '../../domain/value-objects/world-status.vo.js';

export interface GetWorldQuery {
  worldId: string;
}

export interface WorldResult {
  worldId: string;
  name: string;
  region: string;
  status: WorldStatusValue;
  maxPlayers: number;
}

export type ListWorldsResult = WorldResult[];
```

Mapper de aggregate → result (pode ficar no use case ou num helper no mesmo arquivo):

```typescript
import type { World } from '../../domain/entities/world.entity.js';

export function toWorldResult(world: World): WorldResult {
  return {
    worldId: world.id,
    name: world.name.value,
    region: world.region,
    status: world.status.value,
    maxPlayers: world.maxPlayers,
  };
}
```

---



## 10. Passo 8 — Application: use cases

Use cases **podem** usar `@Injectable()` — application orquestra I/O. Domain não.

### 10.1 Listar

Arquivo: `src/modules/world/application/use-cases/list-worlds.use-case.ts`

```typescript
import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  WORLD_REPOSITORY,
  type WorldRepository,
} from '../../domain/repositories/world.repository.js';
import { toWorldResult, type ListWorldsResult } from '../dto/world.dto.js';

@Injectable()
export class ListWorldsUseCase implements UseCase<void, ListWorldsResult> {
  constructor(
    @Inject(WORLD_REPOSITORY)
    private readonly worlds: WorldRepository,
  ) {}

  async execute(): Promise<ListWorldsResult> {
    const list = await this.worlds.list();
    return list.map(toWorldResult);
  }
}
```

`UseCase<void, …>`: chame `execute()` sem argumento no controller.

### 10.2 Buscar um

Arquivo: `src/modules/world/application/use-cases/get-world.use-case.ts`

```typescript
import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  WORLD_REPOSITORY,
  type WorldRepository,
} from '../../domain/repositories/world.repository.js';
import { WorldNotFoundError } from '../../domain/errors/world.errors.js';
import {
  toWorldResult,
  type GetWorldQuery,
  type WorldResult,
} from '../dto/world.dto.js';

@Injectable()
export class GetWorldUseCase implements UseCase<GetWorldQuery, WorldResult> {
  constructor(
    @Inject(WORLD_REPOSITORY)
    private readonly worlds: WorldRepository,
  ) {}

  async execute(query: GetWorldQuery): Promise<WorldResult> {
    const world = await this.worlds.findById(query.worldId);
    if (!world) {
      throw new WorldNotFoundError(query.worldId);
    }

    return toWorldResult(world);
  }
}
```

Não filtre `offline` na listagem nesta v1 — o cliente mostra “em manutenção”. O filtro de criação fica no `character`.

### 10.3 Testes unitários (escreva **antes** do HTTP)

Arquivo: `src/modules/world/application/use-cases/list-worlds.use-case.spec.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { ListWorldsUseCase } from './list-worlds.use-case.js';
import { InMemoryWorldRepository } from '../../infrastructure/persistence/in-memory-world.repository.js';
import { SEEDED_WORLD_IDS } from '../../infrastructure/persistence/seed-worlds.js';

describe('ListWorldsUseCase', () => {
  it('returns the seeded worlds', async () => {
    const useCase = new ListWorldsUseCase(new InMemoryWorldRepository());
    const result = await useCase.execute();

    expect(result).toHaveLength(9);
    // list() ordena por status (online primeiro), depois name ASC
    expect(result.map((w) => w.worldId)).toEqual([
      SEEDED_WORLD_IDS.jupiter,
      SEEDED_WORLD_IDS.mars,
      SEEDED_WORLD_IDS.mercury,
      SEEDED_WORLD_IDS.neptune,
      SEEDED_WORLD_IDS.pluto,
      SEEDED_WORLD_IDS.saturn,
      SEEDED_WORLD_IDS.uranus,
      SEEDED_WORLD_IDS.venus,
      SEEDED_WORLD_IDS.earth,
    ]);

    const earth = result.find((w) => w.name === 'Earth');
    expect(earth).toBeDefined();
    expect(earth?.status).toBe('maintenance');
  });
});
```

Arquivo: `src/modules/world/application/use-cases/get-world.use-case.spec.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { GetWorldUseCase } from './get-world.use-case.js';
import { InMemoryWorldRepository } from '../../infrastructure/persistence/in-memory-world.repository.js';
import { SEEDED_WORLD_IDS } from '../../infrastructure/persistence/seed-worlds.js';
import { WorldNotFoundError } from '../../domain/errors/world.errors.js';

describe('GetWorldUseCase', () => {
  it('returns a seeded world by id', async () => {
    const useCase = new GetWorldUseCase(new InMemoryWorldRepository());
    const result = await useCase.execute({
      worldId: SEEDED_WORLD_IDS.earth,
    });

    expect(result.name).toBe('Earth');
    expect(result.status).toBe('maintenance');
  });

  it('throws WorldNotFoundError for unknown id', async () => {
    const useCase = new GetWorldUseCase(new InMemoryWorldRepository());

    await expect(
      useCase.execute({
        worldId: '00000000-0000-4000-8000-000000000000',
      }),
    ).rejects.toBeInstanceOf(WorldNotFoundError);
  });
});
```

Rode assim que o in-memory existir:

```bash
npx vitest run src/modules/world/application/use-cases
```

Padrão: **instancie o use case com** `new`, sem `Test.createTestingModule`, igual a maior parte dos specs de identity (exceto os que precisam de JwtModule).

---



## 11. Passo 9 — Infrastructure: persistência



### 11.1 Mapper Postgres ↔ domínio

Arquivo: `src/modules/world/infrastructure/persistence/world-row.mapper.ts`

```typescript
import { World } from '../../domain/entities/world.entity.js';
import { WorldName } from '../../domain/value-objects/world-name.vo.js';
import { WorldStatus } from '../../domain/value-objects/world-status.vo.js';

export const WORLD_SELECTED_COLUMNS =
  'id, name, region, status, max_players, created_at';

export interface WorldRow {
  id: string;
  name: string;
  region: string;
  status: string;
  max_players: number;
  created_at: Date;
}

export function mapRowToWorld(row: WorldRow): World {
  return World.rehydrate({
    id: row.id,
    name: WorldName.create(row.name),
    region: row.region,
    status: WorldStatus.create(row.status),
    maxPlayers: row.max_players,
    createdAt: row.created_at,
  });
}
```

`pg` devolve `int` como `number` e `timestamptz` como `Date` com o driver padrão. Se algum teste quebrar com string, faça `new Date(row.created_at)`.

### 11.2 In-memory

Arquivo: `src/modules/world/infrastructure/persistence/in-memory-world.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import type { WorldRepository } from '../../domain/repositories/world.repository.js';
import type { World } from '../../domain/entities/world.entity.js';
import { createSeedWorlds } from './seed-worlds.js';

@Injectable()
export class InMemoryWorldRepository implements WorldRepository {
  private readonly byId = new Map<string, World>();

  constructor() {
    for (const world of createSeedWorlds()) {
      this.byId.set(world.id, world);
    }
  }

  async findById(id: string): Promise<World | null> {
    return this.byId.get(id) ?? null;
  }

  async list(): Promise<World[]> {
    return [...this.byId.values()];
  }
}
```



### 11.3 Postgres

Arquivo: `src/modules/world/infrastructure/persistence/postgres-world.repository.ts`

```typescript
import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../../../../shared/infrastructure/database/database.pool.port.js';
import type { WorldRepository } from '../../domain/repositories/world.repository.js';
import type { World } from '../../domain/entities/world.entity.js';
import {
  mapRowToWorld,
  WORLD_SELECTED_COLUMNS,
  type WorldRow,
} from './world-row.mapper.js';

@Injectable()
export class PostgresWorldRepository implements WorldRepository {
  constructor(
    @Inject(DATABASE_POOL)
    private readonly pool: Pool,
  ) {}

  async findById(id: string): Promise<World | null> {
    const result = await this.pool.query<WorldRow>(
      `SELECT ${WORLD_SELECTED_COLUMNS} FROM worlds WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapRowToWorld(row) : null;
  }

  async list(): Promise<World[]> {
    const result = await this.pool.query<WorldRow>(
      `SELECT ${WORLD_SELECTED_COLUMNS} FROM worlds
       ORDER BY
         CASE status
           WHEN 'online' THEN 0
           WHEN 'maintenance' THEN 1
           WHEN 'offline' THEN 2
           ELSE 3
         END ASC,
         name ASC`,
    );
    return result.rows.map(mapRowToWorld);
  }
}
```

Ordenação: Postgres e in-memory **ambos** ordenam por status (`online` → `maintenance` → `offline`) e, em empate, por `name ASC`.

```typescript
async list(): Promise<World[]> {
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

Arquivo: `migrations/003_create_worlds.sql`

O runner (`src/shared/infrastructure/database/migration.runner.ts`):

1. Lê `migrations/*.sql` em ordem lexicográfica
2. Pula ids já em `schema_migrations`
3. Roda o arquivo **inteiro** numa transação

Por isso o `INSERT` do seed **vai no mesmo arquivo** da `CREATE TABLE`. Se separar `003` (schema) e `004` (seed), também funciona — mas um arquivo só é suficiente para v1.

**Não** use `001` ou `002`: já existem (`identity`).

```sql
CREATE TABLE IF NOT EXISTS worlds (
  id UUID PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  region VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'online',
  max_players INT NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_worlds_name UNIQUE (name),
  CONSTRAINT ck_worlds_status CHECK (status IN ('online', 'maintenance', 'offline')),
  CONSTRAINT ck_worlds_max_players CHECK (max_players >= 1)
);

INSERT INTO worlds (id, name, region, status, max_players, created_at)
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
  -c 'SELECT id, name, status FROM worlds ORDER BY name;'

docker compose exec postgres \
  psql -U pokespace -d pokespace \
  -c "SELECT id FROM schema_migrations WHERE id LIKE '003%';"
```

---



## 13. Passo 11 — Infrastructure: HTTP

Arquivo: `src/modules/world/infrastructure/http/world.controller.ts`

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
import { ListWorldsUseCase } from '../../application/use-cases/list-worlds.use-case.js';
import { GetWorldUseCase } from '../../application/use-cases/get-world.use-case.js';
import {
  WorldDomainError,
  WorldNotFoundError,
} from '../../domain/errors/world.errors.js';

@ApiTags('worlds')
@Controller('worlds')
export class WorldController {
  constructor(
    private readonly listWorlds: ListWorldsUseCase,
    private readonly getWorld: GetWorldUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List game worlds (servers)' })
  async list() {
    return this.listWorlds.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a world by id' })
  async getById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    try {
      return await this.getWorld.execute({ worldId: id });
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  private mapDomainError(error: unknown): never {
    if (error instanceof WorldNotFoundError) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof WorldDomainError) {
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

Arquivo: `src/modules/world/world.module.ts` (já existe — substitua o conteúdo)

```typescript
import { Module } from '@nestjs/common';
import type { Pool } from 'pg';
import {
  DATABASE_POOL,
  useInMemoryUserRepository,
} from '../../shared/infrastructure/database/database.pool.port.js';
import { WORLD_REPOSITORY } from './domain/repositories/world.repository.js';
import { ListWorldsUseCase } from './application/use-cases/list-worlds.use-case.js';
import { GetWorldUseCase } from './application/use-cases/get-world.use-case.js';
import { WorldController } from './infrastructure/http/world.controller.js';
import { InMemoryWorldRepository } from './infrastructure/persistence/in-memory-world.repository.js';
import { PostgresWorldRepository } from './infrastructure/persistence/postgres-world.repository.js';

@Module({
  imports: [],
  controllers: [WorldController],
  providers: [
    ListWorldsUseCase,
    GetWorldUseCase,
    {
      provide: WORLD_REPOSITORY,
      useFactory: (pool: Pool | null) => {
        if (useInMemoryUserRepository() || !pool) {
          return new InMemoryWorldRepository();
        }

        return new PostgresWorldRepository(pool);
      },
      inject: [DATABASE_POOL],
    },
  ],
  exports: [WORLD_REPOSITORY, ListWorldsUseCase, GetWorldUseCase],
})
export class WorldModule {}
```

Pontos importantes:

- `useInMemoryUserRepository()` é o **mesmo** flag de identity (`USER_REPOSITORY_DRIVER=memory`). Não invente `WORLD_REPOSITORY_DRIVER` nesta v1 — o e2e já seta esse env em `vitest.config.e2e.ts`.
- `DATABASE_POOL` vem do `SharedModule` (`@Global()`). Não precisa importar `SharedModule` de novo.
- **Não** importe `IdentityModule`. Rotas públicas.
- `exports` existem para o módulo `character` no futuro.

---



## 15. Passo 13 — Registrar no AppModule

Arquivo: `src/app.module.ts`

Adicione o import ESM e a entrada no array `imports`:

```typescript
import { WorldModule } from './modules/world/world.module.js';
```

```typescript
imports: [
  // ConfigModule, ThrottlerModule, ObserveModule, SharedModule, IdentityModule
  WorldModule,
],
```

Ordem sugerida: `SharedModule`, `IdentityModule`, `WorldModule`. World não depende de Identity.

---



## 16. Passo 14 — Teste e2e

Arquivo: `test/world.e2e-spec.ts`

Copie o bootstrap de `test/app.e2e-spec.ts` (ValidationPipe, prefix, memory drivers). Não compartilhe `app` entre arquivos — cada spec cria o próprio.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { SEEDED_WORLD_IDS } from '../src/modules/world/infrastructure/persistence/seed-worlds.js';

describe('World (e2e)', () => {
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

  it('GET /api/v1/worlds returns seeded worlds', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/worlds')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(9);
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        worldId: expect.any(String),
        name: expect.any(String),
        region: expect.any(String),
        status: expect.stringMatching(/^(online|maintenance|offline)$/),
        maxPlayers: expect.any(Number),
      }),
    );
  });

  it('GET /api/v1/worlds/:id returns one world', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/worlds/${SEEDED_WORLD_IDS.earth}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.name).toBe('Earth');
        expect(body.status).toBe('maintenance');
      });
  });

  it('GET /api/v1/worlds/:id returns 404 when missing', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/worlds/00000000-0000-4000-8000-000000000000')
      .expect(404);
  });

  it('GET /api/v1/worlds/:id returns 400 for invalid uuid', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/worlds/not-a-uuid')
      .expect(400);
  });
});
```

```bash
npm run test:e2e
```

Se o e2e de world falhar com “WorldModule is not part of AppModule”, você esqueceu o passo 13.

---



## 17. Passo 15 — Documentar rotas

Em `[docs/API_ROUTES.md](./API_ROUTES.md)`:

1. Inclua duas linhas na tabela **Visão geral**.
2. Crie a seção **World** no final (antes de qualquer seção Character, que ainda não existe).

Texto sugerido:

```markdown
| `GET` | `/api/v1/worlds` | Não | Lista mundos (servidores) |
| `GET` | `/api/v1/worlds/:id` | Não | Detalhe de um mundo |

## World

Catálogo de servidores. Somente leitura. Seed via migration `003_create_worlds.sql` (9 mundos: Mercury…Pluto).

### `GET /api/v1/worlds`

**Auth:** não

**Response `200`:** array ordenado por status (`online` → `maintenance` → `offline`), depois `name` ASC

```json
{
  "worldId": "uuid",
  "name": "Mercury",
  "region": "mercury",
  "status": "online",
  "maxPlayers": 1100
}
```

`status`: `online` | `maintenance` | `offline`.

### `GET /api/v1/worlds/:id`

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
[ ] world.errors.ts + VOs + World.rehydrate + isJoinable()
[ ] WORLD_REPOSITORY (Symbol + interface read-only)
[ ] seed-worlds.ts com 9 UUIDs fixos (planetas)
[ ] InMemoryWorldRepository já nasce com o seed
[ ] PostgresWorldRepository + mapper
[ ] ListWorldsUseCase + GetWorldUseCase
[ ] Specs unitários verdes (npm test)
[ ] migrations/003_create_worlds.sql (DDL + INSERT)
[ ] WorldController público + ParseUUIDPipe + mapDomainError
[ ] world.module.ts factory memory/postgres
[ ] AppModule importa WorldModule
[ ] test/world.e2e-spec.ts verde
[ ] docs/API_ROUTES.md atualizado
[ ] curl local com Postgres (opcional, mas recomendado)
[ ] npm run lint sem erro novo
```

---

## 19. Como o Character vai consumir isso (não implemente agora)

Quando o módulo `character` existir:

```typescript
// character.module.ts
imports: [WorldModule, IdentityModule],
```

No `CreateCharacterUseCase`:

```typescript
const world = await this.getWorld.execute({ worldId: command.worldId });
// ou injete WORLD_REPOSITORY e chame findById

if (world.status !== 'online') {
  throw new WorldNotJoinableError(world.worldId);
}
```

Se usar o port em vez do use case, chame `world.isJoinable()` no aggregate — a regra fica no domínio de World, não duplicada em Character.

Nickname único **por mundo** = unique `(world_id, nickname)` na tabela `characters`, não neste módulo.

---

## 20. Anti-patterns específicos deste módulo


| Não faça                                        | Por quê                                                                                                                                                                                                   |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /worlds` na v1                            | Sem admin, sem auth de staff                                                                                                                                                                              |
| Importar `PostgresWorldRepository` no Character | Quebra o bounded context                                                                                                                                                                                  |
| Colocar SQL no controller                       | Regra e persistência grudadas no HTTP                                                                                                                                                                     |
| `@Injectable()` na entity `World`               | Domínio puro                                                                                                                                                                                              |
| Esquecer o seed no in-memory                    | E2E memory ≠ Postgres                                                                                                                                                                                     |
| `currentPlayers` fake                           | Contrato mentiroso                                                                                                                                                                                        |
| Novo env `WORLD_DRIVER`                         | E2E e identity já usam `USER_REPOSITORY_DRIVER`                                                                                                                                                           |
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
| `world.module.ts`               | composition    | Sim                            | Só o tipo `Pool`         |


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