# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Infraestructura (levantar antes de iniciar la app)
docker-compose up -d

# Desarrollo con hot-reload
npm run start:dev

# Compilar sin emitir (verificar errores TypeScript)
npx tsc --noEmit

# Build de producción
npm run build

# Lint con autofix
npm run lint

# Tests unitarios
npm test

# Un solo test por nombre
npx jest --testNamePattern="nombre del test"

# Tests e2e
npm run test:e2e
```

La app corre en `http://localhost:3000/api`. Swagger en `http://localhost:3000/api/docs`. Kafka UI en `http://localhost:8080`.

## Arquitectura

El proyecto sigue **arquitectura hexagonal** estricta. La regla de oro: las dependencias siempre apuntan hacia adentro — infraestructura conoce la aplicación, la aplicación conoce el dominio, el dominio no conoce a nadie.

```
src/
├── shared/                   # Código transversal (no pertenece a ningún módulo)
│   ├── domain/               # DomainException (base abstracta para todas las excepciones)
│   ├── http/                 # DomainExceptionFilter (mapea statusCode → HTTP)
│   └── events/
│       ├── domain/           # PolicyDomainEvent interface + PolicyTopics const
│       └── infrastructure/   # KafkaEventPublisherAdapter
│
├── config/                   # Singletons globales gestionados por NestJS DI
│   ├── insurance-config.registry.ts   # Primas base, factores de descuento
│   └── policy-number.sequencer.ts     # Generador POL-YYYY-NNNNNN
│
├── customers/                # Módulo de clientes
│   ├── domain/               # Customer entity (inmutable), port, exceptions
│   ├── application/          # CreateCustomerUseCase, GetCustomerUseCase
│   └── infrastructure/
│       ├── http/             # CustomersController, CreateCustomerDto
│       └── persistence/      # CustomerOrmEntity, CustomerMapper, TypeOrmCustomerRepository
│
├── policies/                 # Módulo principal — contiene los 6 patrones de diseño
│   ├── domain/
│   │   ├── enums/            # Branch, PolicyStatus, RatingStrategyType
│   │   ├── value-objects/    # Coverage, RiskProfile (inmutables, con toPlainObject/fromPlainObject)
│   │   ├── ports/            # PolicyRepositoryPort, PolicyFactoryPort, RatingStrategyPort
│   │   ├── states/           # PolicyStatePort + 5 estados (State pattern)
│   │   └── exceptions/       # 5 excepciones de dominio
│   ├── application/
│   │   ├── factories/        # 4 factories concretas (Factory Method)
│   │   ├── strategies/       # 3 estrategias de tarificación (Strategy)
│   │   ├── builders/         # PolicyBuilder fluido (Builder)
│   │   └── use-cases/        # CreatePolicy, ChangePolicyStatus, GetPolicy, GetPoliciesByCustomer
│   └── infrastructure/
│       ├── http/             # PoliciesController + DTOs
│       └── persistence/      # PolicyOrmEntity, PolicyMapper, TypeOrmPolicyRepository
│
├── notifications/            # Consumer Kafka — Observer (consumidor 1)
└── audit/                    # Consumer Kafka — Observer (consumidor 2)
```

## Patrones de diseño implementados

**Factory Method** — `src/policies/application/factories/`. Cada ramo (AUTO, LIFE, HOME, HEALTH) tiene su propia factory que implementa `PolicyFactoryPort`. `CreatePolicyUseCase` construye un `Map<Branch, PolicyFactoryPort>` en el constructor desde el array inyectado con token `POLICY_FACTORIES`. Agregar un ramo = nueva clase + registrarla en `policies.module.ts`, sin tocar el use case (OCP).

**Strategy** — `src/policies/application/strategies/`. Tres estrategias de tarificación (STANDARD, RISK_BASED, LOYALTY) implementan `RatingStrategyPort`. Mismo mecanismo de Map con token `RATING_STRATEGIES`.

**Builder** — `src/policies/application/builders/policy.builder.ts`. API fluida; `build()` valida todos los campos requeridos y asigna `PolicyStatus.QUOTED`.

**State** — `src/policies/domain/states/`. Cinco clases de estado implementan `PolicyStatePort`. Cada estado sabe sus transiciones válidas y lanza `InvalidStateTransitionException` si la transición no está permitida. `ChangePolicyStatusUseCase` no tiene switch — delega a `currentState.transitionTo(target)`.

**Observer** — `src/shared/events/`. `EventPublisherPort` es el port; `KafkaEventPublisherAdapter` es el adaptador. `ChangePolicyStatusUseCase` publica en un topic de Kafka tras cada cambio de estado. `NotificationsConsumer` y `AuditConsumer` son los dos observadores independientes.

**Singleton** — `InsuranceConfigRegistry` y `PolicyNumberSequencer` en `src/config/`. No usan `getInstance()` — NestJS DI con scope DEFAULT garantiza una sola instancia por aplicación.

## Reglas de TypeScript críticas

Con `moduleResolution: nodenext` + `isolatedModules: true` + `emitDecoratorMetadata: true`, **toda interfaz usada como tipo en un parámetro decorado debe importarse con `import type`**:

```typescript
// CORRECTO
import type { CustomerRepositoryPort } from '../../domain/ports/customer.repository.port';

// INCORRECTO — produce TS1272
import { CustomerRepositoryPort } from '../../domain/ports/customer.repository.port';
```

Esto aplica en: use cases (parámetros de constructor con `@Inject`), consumers (`@Payload`), y cualquier adaptador con decoradores de NestJS.

Las entidades ORM de TypeORM deben usar `!` (definite assignment assertion) en todas sus propiedades porque TypeORM las asigna por reflexión, no por constructor:

```typescript
@Column()
name!: string;
```

## Convenciones del proyecto

- **Entidades de dominio son inmutables**: todos los campos `readonly`. Los cambios de estado devuelven una nueva instancia (`withStatus()`, `deactivate()`).
- **Mappers son clases estáticas** (`CustomerMapper`, `PolicyMapper`): `toDomain(orm)` y `toOrm(domain)`. Son el único punto que conoce tanto el dominio como TypeORM.
- **Ports en el dominio**: las interfaces que definen contratos con el exterior viven en `domain/ports/`. Las implementaciones viven en `infrastructure/`.
- **Excepciones de negocio** extienden `DomainException` con un `statusCode` HTTP explícito. `DomainExceptionFilter` las captura globalmente.
- **Prefijo global**: todas las rutas tienen prefijo `/api`. Endpoints: `POST /api/customers`, `GET /api/customers/:id`, `POST /api/policies`, `GET /api/policies/:id`, `GET /api/policies/customer/:customerId`, `PATCH /api/policies/:id/status`.
- **Value Objects** (`Coverage`, `RiskProfile`) tienen `toPlainObject()` para serializar a JSONB en PostgreSQL y `static fromPlainObject()` para deserializar al leer de la BD.

## Variables de entorno requeridas

El proyecto espera un archivo `.env` en la raíz con: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `APP_PORT`, `KAFKA_BROKER`, `KAFKA_GROUP_ID`.
