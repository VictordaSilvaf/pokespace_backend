# Como criar um novo módulo do zero

Guia passo a passo para adicionar um bounded context ao monólito modular do PokeSpace.

Usaremos como exemplo o módulo **`player`** — perfil do treinador criado após o registro em `identity`. O módulo `identity` já existente é a referência real do projeto.

Playbook específico do catálogo de servidores: [`WORLD_MODULE.md`](./WORLD_MODULE.md).

---

## Visão geral do fluxo

```
1. Definir o bounded context
2. Criar a estrutura de pastas
3. Domain (regras puras)
4. Application (casos de uso)
5. Infrastructure (HTTP, DB, adapters)
6. Traduções i18n (obrigatório) — en, pt-BR, es
7. NestJS Module (wiring)
8. Registrar no AppModule
9. Migration SQL (se persistir no Postgres)
10. Testes + `pnpm check:i18n`
11. Documentar rotas
```

Regra de ouro: **dependências sempre apontam para dentro**.

```
infrastructure  →  application  →  domain
```

O domínio **nunca** importa NestJS, Postgres, Redis ou HTTP.

---

## Passo 0 — Antes de codar

Responda:

| Pergunta | Exemplo `player` |
| --- | --- |
| Qual o nome do contexto? | `player` |
| Quais aggregates existem? | `PlayerProfile` |
| O que é persistido? | Tabela `player_profiles` |
| Quais rotas HTTP? | `GET/PATCH /players/me` |
| Depende de outro módulo? | Sim — `userId` vem do `identity` |
| Comunicação entre módulos? | Evento `identity.user.registered` → criar perfil |

Se o módulo precisar de dados de outro contexto, **não importe o repositório interno** do outro módulo. Use eventos ou uma facade pública exportada pelo módulo dono.

---

## Passo 1 — Estrutura de pastas

Crie a árvore em `src/modules/<nome>/`:

```
src/modules/player/
├── domain/
│   ├── entities/
│   │   └── player-profile.entity.ts
│   ├── value-objects/
│   │   └── display-name.vo.ts
│   ├── events/
│   │   └── player-profile-created.event.ts
│   ├── repositories/
│   │   └── player-profile.repository.ts    # port (interface)
│   └── errors/
│       └── player.errors.ts
├── application/
│   ├── dto/
│   │   └── player.dto.ts                   # Command / Query / Result
│   ├── use-cases/
│   │   ├── create-player-profile.use-case.ts
│   │   ├── get-player-profile.use-case.ts
│   │   └── update-player-profile.use-case.ts
│   └── ports/                              # opcional — serviços externos
├── infrastructure/
│   ├── http/
│   │   ├── player.controller.ts
│   │   └── dto/
│   │       └── player-request.dto.ts
│   └── persistence/
│       ├── in-memory-player-profile.repository.ts
│       ├── postgres-player-profile.repository.ts
│       └── player-profile-row.mapper.ts
└── player.module.ts
```

---

## Passo 2 — Domain: erros

Erros tipados permitem ao controller mapear HTTP sem `if (message.includes(...))`.

```typescript
// src/modules/player/domain/errors/player.errors.ts

export class PlayerDomainError extends Error {
  readonly code: string;
  readonly args?: Record<string, string | number | boolean>;

  constructor(
    code: string,
    message: string,
    args?: Record<string, string | number | boolean>,
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.args = args;
  }
}

export class PlayerProfileNotFoundError extends PlayerDomainError {
  constructor(userId: string) {
    super(
      'PLAYER_PROFILE_NOT_FOUND',
      `Player profile not found for user: ${userId}`,
      { userId },
    );
  }
}

export class DisplayNameAlreadyTakenError extends PlayerDomainError {
  constructor(displayName: string) {
    super(
      'DISPLAY_NAME_TAKEN',
      `Display name already taken: ${displayName}`,
      { displayName },
    );
  }
}
```

Padrão igual a [`identity.errors.ts`](../src/modules/identity/domain/errors/identity.errors.ts).

> **Obrigatório:** toda mensagem de domínio/HTTP/sucesso do módulo deve ter chave estável (`code`) e tradução em `en`, `pt-BR` e `es`. Ver [Passo 6 — i18n](#passo-6--traduções-i18n-obrigatório).

---

## Passo 3 — Domain: value object

Value objects validam formato e encapsulam regras locais.

```typescript
// src/modules/player/domain/value-objects/display-name.vo.ts

import { ValueObject } from '../../../../shared/domain/value-object.js';
import { PlayerDomainError } from '../errors/player.errors.js';

interface DisplayNameProps {
  value: string;
}

export class DisplayName extends ValueObject<DisplayNameProps> {
  private constructor(props: DisplayNameProps) {
    super(props);
  }

  static create(raw: string): DisplayName {
    const value = raw.trim();

    if (value.length < 2 || value.length > 30) {
      throw new PlayerDomainError('Display name must be 2–30 characters');
    }

    return new DisplayName({ value });
  }

  get value(): string {
    return this.props.value;
  }
}
```

Referência: [`username.vo.ts`](../src/modules/identity/domain/value-objects/username.vo.ts).

---

## Passo 4 — Domain: aggregate + evento

O aggregate concentra regras e emite eventos de domínio.

```typescript
// src/modules/player/domain/events/player-profile-created.event.ts

import { DomainEvent } from '../../../../shared/domain/domain-event.js';

export class PlayerProfileCreatedEvent extends DomainEvent {
  constructor(
    readonly profileId: string,
    readonly userId: string,
    readonly displayName: string,
  ) {
    super('player.profile.created');
  }
}
```

```typescript
// src/modules/player/domain/entities/player-profile.entity.ts

import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '../../../../shared/domain/aggregate-root.js';
import { DisplayName } from '../value-objects/display-name.vo.js';
import { PlayerProfileCreatedEvent } from '../events/player-profile-created.event.js';

export class PlayerProfile extends AggregateRoot<string> {
  private constructor(
    id: string,
    private readonly _userId: string,
    private _displayName: DisplayName,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {
    super(id);
  }

  static createForUser(userId: string, displayName: DisplayName): PlayerProfile {
    const profile = new PlayerProfile(
      randomUUID(),
      userId,
      displayName,
      new Date(),
      new Date(),
    );

    profile.addDomainEvent(
      new PlayerProfileCreatedEvent(profile.id, userId, displayName.value),
    );

    return profile;
  }

  static rehydrate(props: {
    id: string;
    userId: string;
    displayName: DisplayName;
    createdAt: Date;
    updatedAt: Date;
  }): PlayerProfile {
    return new PlayerProfile(
      props.id,
      props.userId,
      props.displayName,
      props.createdAt,
      props.updatedAt,
    );
  }

  get userId(): string {
    return this._userId;
  }

  get displayName(): DisplayName {
    return this._displayName;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  rename(displayName: DisplayName): void {
    this._displayName = displayName;
    this._updatedAt = new Date();
  }
}
```

---

## Passo 5 — Domain: port do repositório

A **interface** fica no domínio; a implementação fica na infrastructure.

```typescript
// src/modules/player/domain/repositories/player-profile.repository.ts

import type { PlayerProfile } from '../entities/player-profile.entity.js';
import type { DisplayName } from '../value-objects/display-name.vo.js';

export const PLAYER_PROFILE_REPOSITORY = Symbol('PLAYER_PROFILE_REPOSITORY');

export interface PlayerProfileRepository {
  findByUserId(userId: string): Promise<PlayerProfile | null>;
  findByDisplayName(displayName: DisplayName): Promise<PlayerProfile | null>;
  save(profile: PlayerProfile): Promise<void>;
  update(profile: PlayerProfile): Promise<void>;
}
```

O `Symbol` é o token de injeção de dependência no NestJS — mesmo padrão de [`user.repository.ts`](../src/modules/identity/domain/repositories/user.repository.ts).

---

## Passo 6 — Application: DTOs

Separe **Command** (entrada), **Query** (leitura) e **Result** (saída). Não use classes do NestJS aqui.

```typescript
// src/modules/player/application/dto/player.dto.ts

export interface CreatePlayerProfileCommand {
  userId: string;
  displayName: string;
}

export interface GetPlayerProfileQuery {
  userId: string;
}

export interface UpdatePlayerProfileCommand {
  userId: string;
  displayName: string;
}

export interface PlayerProfileResult {
  profileId: string;
  userId: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Passo 7 — Application: use case

Use cases orquestram domínio + ports. Implementam `UseCase<TInput, TOutput>` do shared.

```typescript
// src/modules/player/application/use-cases/create-player-profile.use-case.ts

import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  EVENT_PUBLISHER,
  type EventPublisher,
} from '../../../../shared/application/ports/event-publisher.port.js';
import type {
  CreatePlayerProfileCommand,
  PlayerProfileResult,
} from '../dto/player.dto.js';
import {
  PLAYER_PROFILE_REPOSITORY,
  type PlayerProfileRepository,
} from '../../domain/repositories/player-profile.repository.js';
import { DisplayName } from '../../domain/value-objects/display-name.vo.js';
import { PlayerProfile } from '../../domain/entities/player-profile.entity.js';
import { DisplayNameAlreadyTakenError } from '../../domain/errors/player.errors.js';

@Injectable()
export class CreatePlayerProfileUseCase
  implements UseCase<CreatePlayerProfileCommand, PlayerProfileResult>
{
  constructor(
    @Inject(PLAYER_PROFILE_REPOSITORY)
    private readonly profiles: PlayerProfileRepository,
    @Inject(EVENT_PUBLISHER)
    private readonly events: EventPublisher,
  ) {}

  async execute(command: CreatePlayerProfileCommand): Promise<PlayerProfileResult> {
    const displayName = DisplayName.create(command.displayName);

    const existing = await this.profiles.findByDisplayName(displayName);
    if (existing) {
      throw new DisplayNameAlreadyTakenError(displayName.value);
    }

    const profile = PlayerProfile.createForUser(command.userId, displayName);
    await this.profiles.save(profile);
    await this.events.publish(profile.pullDomainEvents());

    return {
      profileId: profile.id,
      userId: profile.userId,
      displayName: profile.displayName.value,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }
}
```

**Teste unitário** (sem Nest, sem DB): instancie o use case com `InMemoryPlayerProfileRepository` + `SilentEventPublisher`, igual em [`register-user.use-case.spec.ts`](../src/modules/identity/application/use-cases/register-user.use-case.spec.ts).

---

## Passo 8 — Infrastructure: persistência

### 8.1 Mapper (Postgres ↔ domínio)

```typescript
// src/modules/player/infrastructure/persistence/player-profile-row.mapper.ts

import { PlayerProfile } from '../../domain/entities/player-profile.entity.js';
import { DisplayName } from '../../domain/value-objects/display-name.vo.js';

export interface PlayerProfileRow {
  id: string;
  user_id: string;
  display_name: string;
  created_at: Date;
  updated_at: Date;
}

export function mapRowToPlayerProfile(row: PlayerProfileRow): PlayerProfile {
  return PlayerProfile.rehydrate({
    id: row.id,
    userId: row.user_id,
    displayName: DisplayName.create(row.display_name),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
```

### 8.2 Implementação Postgres

```typescript
// src/modules/player/infrastructure/persistence/postgres-player-profile.repository.ts

import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../../../../shared/infrastructure/database/database.pool.port.js';
import type { PlayerProfileRepository } from '../../domain/repositories/player-profile.repository.js';
import type { PlayerProfile } from '../../domain/entities/player-profile.entity.js';
import type { DisplayName } from '../../domain/value-objects/display-name.vo.js';
import { mapRowToPlayerProfile, type PlayerProfileRow } from './player-profile-row.mapper.js';

@Injectable()
export class PostgresPlayerProfileRepository implements PlayerProfileRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findByUserId(userId: string): Promise<PlayerProfile | null> {
    const result = await this.pool.query<PlayerProfileRow>(
      `SELECT id, user_id, display_name, created_at, updated_at
       FROM player_profiles WHERE user_id = $1`,
      [userId],
    );
    const row = result.rows[0];
    return row ? mapRowToPlayerProfile(row) : null;
  }

  async findByDisplayName(displayName: DisplayName): Promise<PlayerProfile | null> {
    const result = await this.pool.query<PlayerProfileRow>(
      `SELECT id, user_id, display_name, created_at, updated_at
       FROM player_profiles WHERE display_name = $1`,
      [displayName.value],
    );
    const row = result.rows[0];
    return row ? mapRowToPlayerProfile(row) : null;
  }

  async save(profile: PlayerProfile): Promise<void> {
    await this.pool.query(
      `INSERT INTO player_profiles (id, user_id, display_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        profile.id,
        profile.userId,
        profile.displayName.value,
        profile.createdAt,
        profile.updatedAt,
      ],
    );
  }

  async update(profile: PlayerProfile): Promise<void> {
    await this.pool.query(
      `UPDATE player_profiles
       SET display_name = $2, updated_at = $3
       WHERE id = $1`,
      [profile.id, profile.displayName.value, profile.updatedAt],
    );
  }
}
```

### 8.3 Implementação in-memory (testes)

Sempre crie versão in-memory para testes unitários e e2e com `USER_REPOSITORY_DRIVER=memory`.

```typescript
// src/modules/player/infrastructure/persistence/in-memory-player-profile.repository.ts

import { Injectable } from '@nestjs/common';
import type { PlayerProfileRepository } from '../../domain/repositories/player-profile.repository.js';
import type { PlayerProfile } from '../../domain/entities/player-profile.entity.js';
import type { DisplayName } from '../../domain/value-objects/display-name.vo.js';

@Injectable()
export class InMemoryPlayerProfileRepository implements PlayerProfileRepository {
  private readonly byUserId = new Map<string, PlayerProfile>();
  private readonly byDisplayName = new Map<string, string>();

  async findByUserId(userId: string): Promise<PlayerProfile | null> {
    return this.byUserId.get(userId) ?? null;
  }

  async findByDisplayName(displayName: DisplayName): Promise<PlayerProfile | null> {
    const userId = this.byDisplayName.get(displayName.value);
    return userId ? (this.byUserId.get(userId) ?? null) : null;
  }

  async save(profile: PlayerProfile): Promise<void> {
    this.byUserId.set(profile.userId, profile);
    this.byDisplayName.set(profile.displayName.value, profile.userId);
  }

  async update(profile: PlayerProfile): Promise<void> {
    await this.save(profile);
  }
}
```

---

## Passo 9 — Infrastructure: HTTP

### 9.1 DTO de request (class-validator)

```typescript
// src/modules/player/infrastructure/http/dto/player-request.dto.ts

import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePlayerProfileRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  displayName!: string;
}

export class UpdatePlayerProfileRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  displayName!: string;
}
```

### 9.2 Controller fino

O controller **não** contém regra de negócio — só valida HTTP, chama use case e mapeia erros.

```typescript
// src/modules/player/infrastructure/http/player.controller.ts

import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreatePlayerProfileUseCase } from '../../application/use-cases/create-player-profile.use-case.js';
import { GetPlayerProfileUseCase } from '../../application/use-cases/get-player-profile.use-case.js';
import { UpdatePlayerProfileUseCase } from '../../application/use-cases/update-player-profile.use-case.js';
import {
  DisplayNameAlreadyTakenError,
  PlayerDomainError,
  PlayerProfileNotFoundError,
} from '../../domain/errors/player.errors.js';
import { AuthGuard } from '../../../identity/infrastructure/http/auth.guard.js';
import { CurrentUser } from '../../../identity/infrastructure/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../identity/application/dto/auth.dto.js';
import {
  CreatePlayerProfileRequestDto,
  UpdatePlayerProfileRequestDto,
} from './dto/player-request.dto.js';

@Controller('players')
export class PlayerController {
  constructor(
    private readonly createProfile: CreatePlayerProfileUseCase,
    private readonly getProfile: GetPlayerProfileUseCase,
    private readonly updateProfile: UpdatePlayerProfileUseCase,
  ) {}

  @Post('me')
  @UseGuards(AuthGuard)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreatePlayerProfileRequestDto,
  ) {
    try {
      return await this.createProfile.execute({
        userId: user.userId,
        displayName: body.displayName,
      });
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser) {
    try {
      return await this.getProfile.execute({ userId: user.userId });
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdatePlayerProfileRequestDto,
  ) {
    try {
      return await this.updateProfile.execute({
        userId: user.userId,
        displayName: body.displayName,
      });
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  private mapDomainError(error: unknown): never {
    const message =
      error instanceof PlayerDomainError
        ? translateDomainError(error, 'player')
        : error instanceof Error
          ? error.message
          : translate('common.errors.UNEXPECTED');

    if (error instanceof DisplayNameAlreadyTakenError) {
      throw new ConflictException(message);
    }
    if (error instanceof PlayerProfileNotFoundError) {
      throw new NotFoundException(message);
    }
    if (error instanceof PlayerDomainError) {
      throw new BadRequestException(message);
    }
    throw error;
  }
}
```

> **Auth cross-module:** importar `AuthGuard` e `@CurrentUser()` do módulo `identity` é aceitável para rotas protegidas. Não importe repositórios ou use cases internos de outro módulo.

---

## Passo 9.5 — Traduções i18n (obrigatório)

**Todo módulo com erros de domínio e/ou HTTP deve ter catálogos em `en`, `pt-BR` e `es`.** Sem isso o PR não está completo.

### Regras

1. Domínio usa **código estável** (`code`) + `args` opcionais; a string em inglês fica só como fallback de log.
2. Controllers traduzem com `translateDomainError(error, '<módulo>')`.
3. Mensagens de sucesso retornam chave (`identity.success.PASSWORD_UPDATED`); o `LocalizedMessageInterceptor` resolve o texto.
4. Arquivos obrigatórios:

```
src/i18n/en/<módulo>.json
src/i18n/pt-BR/<módulo>.json
src/i18n/es/<módulo>.json
```

5. As chaves de `errors` (e demais seções usadas) devem ser **idênticas** nos três idiomas.
6. Validação automática: `pnpm check:i18n`.

### Exemplo `src/i18n/en/player.json`

```json
{
  "errors": {
    "PLAYER_PROFILE_NOT_FOUND": "Player profile not found for user: {userId}",
    "DISPLAY_NAME_TAKEN": "Display name already taken: {displayName}"
  },
  "success": {
    "PROFILE_UPDATED": "Profile updated"
  }
}
```

Repita o mesmo arquivo em `pt-BR` e `es` com o texto traduzido.

### Como o cliente escolhe o idioma

| Prioridade | Mecanismo |
| --- | --- |
| 1 | Query `?lang=pt-BR` |
| 2 | Header `x-lang: pt-BR` |
| 3 | Header `Accept-Language` |
| fallback | `en` |

---

## Passo 10 — NestJS Module (wiring)

```typescript
// src/modules/player/player.module.ts

import { Module } from '@nestjs/common';
import type { Pool } from 'pg';
import { DATABASE_POOL, useInMemoryUserRepository } from '../../shared/infrastructure/database/database.pool.port.js';
import { PLAYER_PROFILE_REPOSITORY } from './domain/repositories/player-profile.repository.js';
import { CreatePlayerProfileUseCase } from './application/use-cases/create-player-profile.use-case.js';
import { GetPlayerProfileUseCase } from './application/use-cases/get-player-profile.use-case.js';
import { UpdatePlayerProfileUseCase } from './application/use-cases/update-player-profile.use-case.js';
import { PlayerController } from './infrastructure/http/player.controller.js';
import { InMemoryPlayerProfileRepository } from './infrastructure/persistence/in-memory-player-profile.repository.js';
import { PostgresPlayerProfileRepository } from './infrastructure/persistence/postgres-player-profile.repository.js';
import { IdentityModule } from '../identity/identity.module.js';

@Module({
  imports: [IdentityModule], // AuthGuard exportado
  controllers: [PlayerController],
  providers: [
    CreatePlayerProfileUseCase,
    GetPlayerProfileUseCase,
    UpdatePlayerProfileUseCase,
    {
      provide: PLAYER_PROFILE_REPOSITORY,
      useFactory: (pool: Pool | null) => {
        if (useInMemoryUserRepository() || !pool) {
          return new InMemoryPlayerProfileRepository();
        }
        return new PostgresPlayerProfileRepository(pool);
      },
      inject: [DATABASE_POOL],
    },
  ],
  exports: [GetPlayerProfileUseCase],
})
export class PlayerModule {}
```

Padrão de factory Postgres/in-memory: igual [`identity.module.ts`](../src/modules/identity/identity.module.ts).

---

## Passo 11 — Registrar no AppModule

```typescript
// src/app.module.ts

import { PlayerModule } from './modules/player/player.module.js';

@Module({
  imports: [
    // ...
    SharedModule,
    IdentityModule,
    PlayerModule,  // ← adicionar aqui
  ],
})
export class AppModule {}
```

---

## Passo 12 — Migration SQL

Crie `migrations/003_create_player_profiles.sql`:

```sql
CREATE TABLE IF NOT EXISTS player_profiles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name VARCHAR(30) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_profiles_user_id ON player_profiles (user_id);
```

As migrations rodam automaticamente no startup via [`MigrationRunner`](../src/shared/infrastructure/database/migration.runner.ts) quando Postgres está ativo.

---

## Passo 13 — Testes

### Unitário (use case)

```typescript
// src/modules/player/application/use-cases/create-player-profile.use-case.spec.ts

import { describe, expect, it } from 'vitest';
import { CreatePlayerProfileUseCase } from './create-player-profile.use-case.js';
import { InMemoryPlayerProfileRepository } from '../../infrastructure/persistence/in-memory-player-profile.repository.js';
import type { EventPublisher } from '../../../../shared/application/ports/event-publisher.port.js';
import type { DomainEvent } from '../../../../shared/domain/domain-event.js';

class SilentEventPublisher implements EventPublisher {
  async publish(_events: DomainEvent[]): Promise<void> {}
}

describe('CreatePlayerProfileUseCase', () => {
  it('creates a profile for a user', async () => {
    const useCase = new CreatePlayerProfileUseCase(
      new InMemoryPlayerProfileRepository(),
      new SilentEventPublisher(),
    );

    const result = await useCase.execute({
      userId: 'user-1',
      displayName: 'Ash Ketchum',
    });

    expect(result.displayName).toBe('Ash Ketchum');
    expect(result.userId).toBe('user-1');
  });
});
```

### E2E (HTTP)

```typescript
// test/player.e2e-spec.ts

it('POST /players/me creates profile', async () => {
  const register = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email: '...', phone: '...', username: '...', password: '...' })
    .expect(201);

  await request(app.getHttpServer())
    .post('/api/v1/players/me')
    .set('Authorization', `Bearer ${register.body.accessToken}`)
    .send({ displayName: 'Ash Ketchum' })
    .expect(201);
});
```

Configure `vitest.config.e2e.ts` com `USER_REPOSITORY_DRIVER=memory` e `REDIS_DRIVER=memory`.

---

## Passo 14 — Documentar rotas

Adicione as rotas em [`docs/API_ROUTES.md`](./API_ROUTES.md):

```markdown
### `POST /api/v1/players/me`
**Auth:** Bearer
**Body:** `{ "displayName": "Ash Ketchum" }`
**Response `201`:** `{ profileId, userId, displayName, createdAt, updatedAt }`
```

---

## Comunicação entre módulos (eventos)

Quando `identity` registra um usuário, `player` pode criar o perfil automaticamente:

```typescript
// src/modules/player/infrastructure/messaging/on-user-registered.handler.ts

import { Injectable } from '@nestjs/common';
import { CreatePlayerProfileUseCase } from '../../application/use-cases/create-player-profile.use-case.js';

@Injectable()
export class OnUserRegisteredHandler {
  constructor(private readonly createProfile: CreatePlayerProfileUseCase) {}

  async handle(event: { userId: string; username: string }): Promise<void> {
    await this.createProfile.execute({
      userId: event.userId,
      displayName: event.username,
    });
  }
}
```

Hoje o `EventPublisher` é in-memory ([`InMemoryEventPublisher`](../src/shared/infrastructure/messaging/in-memory-event-publisher.ts)). Para produção, evolua para RabbitMQ/Kafka sem mudar os use cases — só troca o adapter.

---

## Checklist final

```
[ ] Pastas domain / application / infrastructure criadas
[ ] Erros de domínio tipados
[ ] Value objects com validação
[ ] Aggregate com eventos de domínio
[ ] Port de repositório (interface + Symbol)
[ ] Use cases implementam UseCase<TInput, TOutput>
[ ] Postgres + in-memory repositories
[ ] Controller fino com mapDomainError + translateDomainError
[ ] Catálogos i18n en / pt-BR / es (`src/i18n/<locale>/<módulo>.json`)
[ ] `pnpm check:i18n` passando
[ ] DTOs HTTP com class-validator
[ ] player.module.ts com factory de repositório
[ ] Registrado no AppModule
[ ] Migration SQL (se Postgres)
[ ] Testes unitários do use case
[ ] Teste e2e da rota principal
[ ] docs/API_ROUTES.md atualizado
```

---

## O que NÃO fazer

| Anti-pattern | Por quê |
| --- | --- |
| Importar `PostgresUserRepository` de outro módulo | Quebra o bounded context |
| Colocar regra de negócio no controller | Dificulta teste e reuso |
| Usar `@Injectable()` no domínio | Domínio deve ser puro |
| Pular a versão in-memory | Testes ficam lentos e frágeis |
| `any` nos DTOs de aplicação | Perde type-safety entre camadas |
| Esquecer extensão `.js` nos imports | Projeto usa ESM |

---

## Referências no projeto

| O quê | Onde ver |
| --- | --- |
| Módulo completo de referência | [`src/modules/identity/`](../src/modules/identity/) |
| Shared kernel | [`src/shared/`](../src/shared/) |
| Arquitetura geral | [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) |
| Rotas existentes | [`docs/API_ROUTES.md`](./API_ROUTES.md) |
| Migrations | [`migrations/`](../migrations/) |

---

## Ordem recomendada para o primeiro módulo

1. Comece pelo **domínio** (entity + 1 regra)
2. Escreva o **use case** + teste unitário com in-memory
3. Só depois adicione **HTTP** e **Postgres**
4. Por último: eventos cross-module e adapters externos

Assim você valida a regra de negócio antes de investir em infraestrutura.
