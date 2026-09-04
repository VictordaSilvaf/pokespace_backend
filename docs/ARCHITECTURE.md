# Arquitetura do Backend — PokeSpace

## 1. Visão geral

O backend do jogo é construído com **NestJS** como framework de composição e I/O, seguindo:

| Abordagem | Papel no projeto |
| --- | --- |
| **Domain-Driven Design (DDD)** | Bounded contexts, aggregates, value objects e linguagem ubíqua |
| **Clean Architecture** | Dependências apontam para dentro (domínio no centro) |
| **Hexagonal Architecture** | Ports (contratos) + Adapters (implementações técnicas) |
| **Modular Monolith** | Um deploy, vários módulos com fronteiras claras |
| **Event-Driven Architecture** | Desacoplamento via eventos de domínio / integração |
| **REST + WebSocket** | API síncrona (REST) e tempo real (WS) |
| **RabbitMQ** | Filas para trabalho assíncrono (jobs, side-effects) |
| **Kafka** | Streaming de eventos de alto volume / histórico |

O projeto começa como **monólito modular**: baixo acoplamento e fronteiras explícitas, com caminho aberto para extrair módulos em microserviços se a escala justificar.

**i18n obrigatório:** mensagens de domínio, HTTP e sucesso usam chaves estáveis traduzidas em `en`, `pt-BR` e `es` (`src/i18n/`). Todo módulo novo com erros/HTTP deve incluir catálogos nos três idiomas e passar em `pnpm check:i18n`. Detalhes em [`CREATING_A_MODULE.md`](./CREATING_A_MODULE.md).

```
┌─────────────────────────────────────────────────────────────┐
│                     Modular Monolith                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ Identity │ │  Player  │ │  Battle  │ │  ...modules  │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘   │
│       │            │            │               │           │
│       └────────────┴───── events / ports ───────┘           │
│                                                             │
│  Adapters: REST · WebSocket · Postgres · Redis · RabbitMQ · Kafka │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Objetivos arquiteturais

1. Separar regras de negócio de detalhes técnicos.
2. Manter o domínio independente do NestJS e de frameworks externos.
3. Permitir testes unitários das regras de negócio sem infraestrutura.
4. Evitar que controllers concentrem regras de negócio.
5. Separar estado persistente do servidor de estado temporário (sessão, cache, realtime).
6. Utilizar eventos para desacoplar funcionalidades.
7. Permitir processamento assíncrono através de filas.

---

## 3. Camadas (por módulo)

Cada módulo de negócio segue a mesma estrutura interna:

```
modules/<contexto>/
├── domain/                 # Núcleo puro (sem NestJS, sem DB, sem HTTP)
│   ├── entities/
│   ├── value-objects/
│   ├── events/
│   ├── repositories/       # Ports de persistência
│   └── errors/
├── application/            # Casos de uso (orquestração do domínio)
│   ├── use-cases/
│   ├── dto/                # Commands / Queries / Results
│   └── ports/              # Ports de serviços externos (hash, token, mail…)
└── infrastructure/         # Adapters + NestJS
    ├── http/               # Controllers, DTOs de request/response
    ├── persistence/        # Implementações de repositório
    ├── adapters/           # Hash, JWT, mailers, etc.
    └── messaging/          # Publishers/consumers (quando necessário)
```

### Regra de dependência

```
infrastructure  →  application  →  domain
       ↑                ↑
   NestJS/DB/HTTP    use cases
```

- **Domain**: não importa NestJS, TypeORM, amqplib, kafkajs, etc.
- **Application**: orquestra domínio + ports; não conhece Express/HTTP.
- **Infrastructure**: implementa ports e conecta o mundo externo ao Nest.

---

## 4. Shared kernel

Código transversal e estável fica em `src/shared/`:

- Bases de domínio (`Entity`, `AggregateRoot`, `ValueObject`, `DomainEvent`)
- Contrato de use case
- Ports compartilhados (ex.: publisher de eventos, clock)
- Adapters de infraestrutura compartilhados (mensageria in-memory → RabbitMQ/Kafka)

Evite colocar regra de negócio de um contexto no shared. Se só `Identity` usa, fica em `Identity`.

---

## 5. Comunicação entre módulos

Preferência (do mais acoplado ao mais desacoplado):

1. **Não chamar outro módulo diretamente** pela implementação interna.
2. Expor **facades / application services** públicos do módulo, se sync for necessário.
3. Preferir **eventos de domínio / integração** para side-effects (ex.: `UserRegistered` → criar perfil em Player).

Eventos locais podem começar in-memory. Depois:

- **RabbitMQ** — tarefas assíncronas, retries, work queues
- **Kafka** — stream de eventos, múltiplos consumidores, replay

---

## 6. Estado do servidor vs estado temporário

| Tipo | Exemplos | Onde vive |
| --- | --- | --- |
| **Persistente** | usuário, inventário, progresso | DB (Postgres, etc.) via repositórios |
| **Temporário / sessão** | refresh tokens ativos, rate limit | Redis / store de sessão |
| **Realtime** | presença, sala de batalha ao vivo | memória do processo / Redis + WebSocket |

Controllers e gateways **não** guardam regra de negócio; apenas adaptam I/O.

Infra local via Docker Compose: `postgres`, `redis`, `rabbitmq`, `kafka`, `mailpit` (+ `api`). Ver README.

**Fase 2 (planejado):** OAuth (Google/Apple), SMS real (Twilio).

---

## 7. Entradas e saídas

| Canal | Uso |
| --- | --- |
| **REST** | comandos/consultas CRUD e auth |
| **WebSocket** | gameplay em tempo real, presença |
| **RabbitMQ** | jobs (e-mail, sync, side-effects com retry) |
| **Kafka** | eventos de domínio/integração em escala |

---

## 8. Testes

| Tipo | O que cobre | Depende de Nest/DB? |
| --- | --- | --- |
| Unitário de domínio / use case | regras de negócio | Não |
| Integração de adapter | repo real, hash, token | Sim (infra) |
| E2E HTTP | fluxo completo via REST | Sim |

Primeira feature (`Identity`) já inclui exemplo de teste de use case sem infraestrutura.

---

## 9. Primeira feature: Identity (autenticação)

Bounded context responsável por:

- Registro de usuário
- Login
- Emissão/validação de tokens (via port)
- Eventos: `UserRegistered`, `UserLoggedIn`

Fluxo típico:

```
HTTP AuthController
    → RegisterUserUseCase / LoginUserUseCase
        → User (aggregate) + UserRepository + PasswordHasher + TokenService
            → Domain events → EventPublisher
```

Implementações iniciais usam adapters **in-memory / Node crypto** para destravar desenvolvimento. Trocas futuras (Postgres, JWT/Passport, bcrypt, RabbitMQ) entram só em `infrastructure/`, sem reescrever o domínio.

---

## 10. Evolução para microserviços

Quando um módulo precisar de escala/equipe própria:

1. O módulo já tem ports e eventos bem definidos.
2. Extrai o bounded context para um deploy separado.
3. Substitui chamadas in-process por REST/gRPC + fila/stream.
4. Mantém o contrato de eventos estável.

A estrutura de pastas e ports existe exatamente para tornar essa extração barata.

---

## 11. Convenções rápidas

- Sufixo `.use-case.ts` para casos de uso
- Sufixo `.port.ts` / interface + token Nest para DI
- Sufixo `.adapter.ts` / `.repository.ts` nas implementações
- Imports ESM com extensão `.js` (padrão do projeto)
- Controllers finos: validam input HTTP e delegam ao use case
- Erros de domínio tipados em `domain/errors`
- **Novo módulo do zero:** ver [docs/CREATING_A_MODULE.md](./CREATING_A_MODULE.md)
