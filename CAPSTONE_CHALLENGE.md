# Reto Integrador — Insurance API (Pólizas de Seguros)

**Duración estimada:** 5 a 7 días · **Dominio fijo:** Emisión y ciclo de vida de pólizas de seguros · **Stack:** libre

> Este es el **reto final del proceso**. No evalúa un patrón aislado, sino la **apropiación integral** de todo lo trabajado: los pilares de la POO, los principios SOLID, código limpio, y **seis patrones de diseño** aplicados de forma coherente en un solo dominio. El Singleton es un **reto adicional de investigación**.

## 1. Contexto

A lo largo del proceso construimos el `bank-api`, donde aplicamos —por capas hexagonales— Strategy (transferencias), Observer/Kafka (notificaciones y auditoría), y luego Factory Method, Builder y State (módulo `bank-products`). En cada reto previo (p.ej. Courier) demostraste un subconjunto de esos patrones en un dominio nuevo.

Aquí los reunís **todos en un solo proyecto** sobre un dominio diferente: una **API de gestión de pólizas de seguros**. El objetivo no es copiar el `bank-api` cambiando nombres, sino demostrar que entendiste cada concepto lo suficiente para combinarlos con criterio, con reglas y estados **distintos** a los del banco.

## 2. Conocimientos que se evalúan

| Bloque | Qué se espera que demuestres |
|---|---|
| **Pilares de la POO** | Abstracción, encapsulamiento, herencia y polimorfismo aplicados con intención (no por inercia). |
| **SOLID** | Las cinco letras visibles en el diseño: SRP, OCP, LSP, ISP, DIP. |
| **Código limpio** | Nombres reveladores, funciones pequeñas, sin código muerto ni números mágicos, manejo de errores claro. |
| **Arquitectura hexagonal** | Ports & Adapters por módulo; dominio aislado de infraestructura. |
| **Factory Method** | Creación de pólizas por ramo, sin `switch` en el caller. |
| **Builder** | Ensamblado fluido y validado del agregado `Policy`. |
| **State** | Ciclo de vida de la póliza como máquina de estados (una clase por estado). |
| **Strategy** | Algoritmos de tarificación de la prima, intercambiables. |
| **Observer** | Eventos de dominio publicados a un broker real; ≥ 2 consumers desacoplados. |
| **Singleton** *(reto adicional)* | Investigado y aplicado a un recurso que genuinamente deba ser único. |

## 3. Dominio del reto

Tu API administra **clientes** (`Customer`) que contratan **pólizas** (`Policy`). Cada póliza es de uno de **cuatro ramos**, se **tarifica** con una de varias estrategias de pricing, y atraviesa un **ciclo de vida** de cinco estados.

### Entidades principales

**Customer**
- `id` (UUID), `name`, `email` (único), `isActive`, timestamps. Puedes reutilizar el módulo de usuarios del `bank-api`; no es el foco.

**Policy**
- `id` (UUID), `policyNumber` (único, generado), `customerId`, `branch`, `ratingStrategy`, `status`, `coverage` (JSON), `monthlyPremium` (calculado), `riskProfile` (JSON), `createdAt`, `updatedAt`.
- `branch`: `AUTO` | `LIFE` | `HOME` | `HEALTH`.
- `ratingStrategy`: `STANDARD` | `RISK_BASED` | `LOYALTY`.
- `status`: `QUOTED` | `ISSUED` | `ACTIVE` | `SUSPENDED` | `CANCELLED`.

### 3.1 Configuración por ramo — **Factory Method**

Cada ramo se crea con una **cobertura por defecto** específica. La lógica de "qué cobertura corresponde a cada ramo" vive en una **factory por ramo**; el caller (use case) **no** decide la cobertura con un `switch (branch)`.

| Ramo | Cobertura por defecto | Prima base mensual |
|---|---|---|
| `AUTO` | `coverageAmount` 80 000 000 · `deductible` 1 000 000 · `termMonths` 12 | 120 000 |
| `LIFE` | `coverageAmount` 200 000 000 · `beneficiaryRequired` true · `termMonths` 12 | 90 000 |
| `HOME` | `coverageAmount` 150 000 000 · `deductible` 2 000 000 · `termMonths` 12 | 75 000 |
| `HEALTH` | `coverageAmount` 100 000 000 · `copayRate` 0.20 · `waitingPeriodDays` 30 | 180 000 |

### 3.2 Tarificación de la prima — **Strategy**

La **prima base** del ramo (columna anterior) se ajusta con la **estrategia de tarificación** elegida al cotizar. Cada estrategia es una clase intercambiable; el use case la selecciona con un `Map`/registro, **sin `switch`**.

| Estrategia | `monthlyPremium` resultante | Validación específica |
|---|---|---|
| `STANDARD` | prima base, sin ajuste | ninguna |
| `RISK_BASED` | prima base × (1 + `riskProfile.riskScore` / 100) | `riskProfile.riskScore` ∈ [0, 100] obligatorio |
| `LOYALTY` | prima base × 0.85 (15 % de descuento) | `riskProfile.customerSince` (año) obligatorio; antigüedad ≥ 2 años |

Reglas comunes: el `customerId` debe corresponder a un cliente **existente y activo**; toda póliza recién creada inicia en `QUOTED`; la cobertura y la prima calculada son **inmutables** tras la creación.

> **Factory vs. Strategy (no los confundas):** la *factory* decide **qué cobertura** trae el ramo; la *strategy* decide **cómo se calcula el precio**. Son responsabilidades distintas y deben vivir en clases distintas.

### 3.3 Ciclo de vida — **State**

La póliza solo transiciona por las rutas válidas que **cada estado** define. Es una máquina de **cinco** estados (uno más que el banco: existe `ISSUED` entre la cotización y la vigencia):

```
QUOTED     → ISSUED | CANCELLED
ISSUED     → ACTIVE | CANCELLED
ACTIVE     → SUSPENDED | CANCELLED
SUSPENDED  → ACTIVE | CANCELLED
CANCELLED  → (terminal, ninguna transición permitida)
```

- Cada estado es **una clase** que implementa un `PolicyStatePort` y declara sus transiciones. El use case de cambio de estado **no** contiene la matriz de transiciones (`switch`/`if`); delega en el estado actual.
- Transición inválida → excepción de dominio descriptiva (HTTP 400). Transicionar al estado actual es **idempotente**.

### 3.4 Eventos — **Observer**

En **cada transición exitosa**, el use case publica al broker:

- `policy.issued` (`QUOTED → ISSUED`) · `policy.activated` (`ISSUED → ACTIVE`) · `policy.suspended` (`ACTIVE → SUSPENDED`) · `policy.reactivated` (`SUSPENDED → ACTIVE`) · `policy.cancelled` (`* → CANCELLED`).

**Dos consumers independientes**: `NotificationsConsumer` (notifica al cliente) y `AuditConsumer` (traza de auditoría). Payload mínimo: `policyId`, `policyNumber`, `customerId`, `branch`, `oldStatus`, `newStatus`, `timestamp` (ISO-8601).

### 3.5 Recurso único — **Singleton** *(reto adicional de investigación)*

Investiga el patrón Singleton (incluyendo sus críticas: testabilidad, estado global, alternativas como el scope singleton del contenedor de DI) y aplícalo a **un recurso que genuinamente deba existir una sola vez** en la app. Opciones sugeridas:

- Un **`PolicyNumberSequencer`** que genere `policyNumber` consecutivos y únicos (p.ej. `POL-2026-000123`) garantizando que no haya dos instancias compitiendo por el contador.
- Un **`InsuranceConfigRegistry`** que cargue una sola vez la configuración/tarifas base y la exponga de solo lectura.

En el `README` debes explicar: **por qué** ese recurso amerita Singleton, **cómo** garantizaste la unicidad en tu lenguaje/framework, y **qué riesgo** del patrón mitigaste (o por qué el scope singleton del contenedor de DI es preferible a un Singleton "a mano").

## 4. Endpoints mínimos

```
POST   /api/customers                 crear cliente
GET    /api/customers/:id             por id

POST   /api/policies                  cotizar/crear (Factory + Strategy + Builder → QUOTED)
GET    /api/policies/:id              detalle por id
GET    /api/policies/customer/:id     todas las pólizas de un cliente
PATCH  /api/policies/:id/status       cambiar estado ({ targetStatus }; valida vía State + publica evento)
```

Códigos: `201` creación, `200` lectura/cambio de estado, `400` validación o transición inválida, `404` no encontrado, `409` conflicto (email o `policyNumber` duplicado).

## 5. Requisitos técnicos obligatorios

### Arquitectura y diseño
- **Hexagonal** por módulo (`customers`, `policies`, `shared/events`, `notifications`): carpetas `domain/`, `application/`, `infrastructure/`. El dominio **no** importa ORM, broker ni HTTP.
- Ports en `domain/ports`, estados en `domain/states`, estrategias y factories como clases inyectadas; implementaciones de infraestructura en `infrastructure/`.
- **DIP**: nada de `new` de repos, factories, estrategias o publishers dentro de los use cases — todo por inyección.
- **OCP**: agregar un 5º ramo o una 4ª estrategia de tarificación = **una clase nueva + registro**, sin tocar los use cases.

### Patrones
- **Factory Method**: `PolicyFactoryPort` (`getBranch()`, `createDefaultCoverage()`), 4 concretas, selección por `Map`/registro.
- **Strategy**: `RatingStrategyPort` (`getName()`, `validate()`, `calculatePremium()`), 3 concretas, selección por `Map`/registro.
- **Builder**: `PolicyBuilder` fluido que valida en `build()` y asigna `QUOTED` como estado inicial.
- **State**: `PolicyStatePort` + una clase por estado; transiciones encapsuladas en cada estado.
- **Observer**: `EventPublisher` port + adapter del broker; 2 consumers desacoplados.
- **Singleton**: recurso único justificado (ver 3.5).

### Persistencia, API y contenedores
- ORM real contra BD real; **Mapper** (entidad ORM ≠ modelo de dominio) bidireccional; `coverage`/`riskProfile` como JSON/JSONB y Value Objects en dominio.
- DTOs con validación declarativa; excepciones de dominio custom mapeadas a HTTP vía filtro (`PolicyNotFoundException`→404, `InvalidStateTransitionException`/`UnsupportedBranchException`/`UnsupportedRatingStrategyException`→400, `EmailAlreadyExistsException`→409).
- **Swagger/OpenAPI** en `/api/docs`.
- `docker-compose.yml` que levante BD y broker; secretos en `.env`.

## 6. Stack

Libre (NestJS + TypeORM como el `bank-api`, Spring Boot + JPA, .NET + EF Core, Go + GORM, etc.), siempre que cumplas hexagonal, los **seis patrones**, persistencia real con Mapper, broker real y Swagger.

## 7. Entregables

1. Repositorio Git compartido con el instructor.
2. `README.md` con: stack y por qué; pasos de arranque (`docker-compose up` → correr app → URL de Swagger → UI del broker); descripción de arquitectura; **mapa explícito de los 6 patrones → archivos donde viven**; y la **sección de investigación del Singleton** (por qué, cómo, qué riesgo mitigaste).
3. `docker-compose.yml` funcional.
4. Código fuente organizado.
5. Swagger en `/api/docs`.
6. Colección Postman / `.http` con: los **4 ramos**, las **3 estrategias** de tarificación, un **recorrido completo de ciclo de vida** (`QUOTED→ISSUED→ACTIVE→SUSPENDED→ACTIVE→CANCELLED`) y al menos **dos casos de error** (transición inválida → 400 y `RISK_BASED` sin `riskScore` → 400).
7. Commits atómicos (Conventional Commits).

## 8. Fuera de alcance

No se exige (no se penaliza su ausencia): JWT, autorización por roles, primas prorrateadas, renovaciones automáticas, tests con cobertura mínima, CI/CD, migraciones. Si los incluyes es bonus.

## 9. Referencias del `bank-api` que puedes consultar

- Strategy (port + concretas + selección sin switch): `bank-api/src/transfers/`
- Factory Method: `bank-api/src/bank-products/domain/ports/bank-product-factory.port.ts` y `bank-api/src/bank-products/application/factories/`
- Builder: `bank-api/src/bank-products/application/builders/bank-product.builder.ts`
- State: `bank-api/src/bank-products/domain/states/` y `.../use-cases/change-bank-product-status.use-case.ts`
- Observer (port, adapter, consumers): `bank-api/src/shared/events/` y `bank-api/src/notifications/application/handlers/`
- Mapper: `bank-api/src/bank-products/infrastructure/persistence/bank-product.mapper.ts`
- Singleton: **no hay referencia en el `bank-api`** — es tu reto de investigación.

**No copies y pegues cambiando nombres.** El evaluador mira si entendiste los patrones o solo renombraste clases.

## 10. Criterio de aprobación

Rúbrica de **100 puntos** + **6 puntos bonus** (Singleton) en `CAPSTONE_RUBRIC.md`. Se aprueba con **70 puntos o más**.

¡Éxitos!