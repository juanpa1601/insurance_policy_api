# Insurance Policy API

[![CI](https://github.com/juanpa1601/insurance_policy_api/actions/workflows/ci.yml/badge.svg)](https://github.com/juanpa1601/insurance_policy_api/actions/workflows/ci.yml)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=juanpa1601_insurance_policy_api&metric=coverage)](https://sonarcloud.io/summary/new_code?id=juanpa1601_insurance_policy_api)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=juanpa1601_insurance_policy_api&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=juanpa1601_insurance_policy_api)

API REST para gestionar clientes y pólizas de seguros, construida con NestJS y TypeScript sobre una arquitectura hexagonal (ports & adapters).

## Tecnologías

- NestJS 11 y TypeScript
- PostgreSQL 16 con TypeORM
- Kafka (KafkaJS vía `@nestjs/microservices`)
- Swagger / OpenAPI (`@nestjs/swagger`)
- class-validator y class-transformer
- Docker Compose (PostgreSQL, Kafka en modo KRaft y Kafka UI)

## Qué hace

- **Clientes:** crear, listar y consultar por id. Valida que el email no esté repetido.
- **Pólizas:** emisión para 5 ramos (`AUTO`, `LIFE`, `HOME`, `HEALTH`, `TRAVEL`), con un número de póliza secuencial (`POL-AAAA-NNNNNN`), cobertura por defecto según el ramo y prima mensual calculada.
- **Tarificación:** tres estrategias intercambiables:
  - `STANDARD`: prima base del ramo.
  - `RISK_BASED`: prima base × (1 + `riskScore`/100), con `riskScore` entre 0 y 100.
  - `LOYALTY`: 15 % de descuento si el cliente tiene 2 o más años de antigüedad.
- **Ciclo de vida:** máquina de estados con una clase por estado:

  ```
  QUOTED → ISSUED → ACTIVE ⇄ SUSPENDED
     └────────┴────────┴─────────┴──→ CANCELLED
  ```

  Una transición no permitida responde `400` con `InvalidStateTransitionException`.
- **Eventos de dominio:** cada cambio de estado publica un evento en un topic de Kafka (`policy.issued`, `policy.activated`, `policy.suspended`, `policy.reactivated`, `policy.cancelled`) que consumen, de forma independiente, `AuditConsumer` y `NotificationsConsumer`.

### Patrones de diseño aplicados

| Patrón | Dónde |
|---|---|
| Factory Method | `policies/application/factories`: una factory por ramo, resueltas con un `Map` (sin `switch`) |
| Strategy | `policies/application/strategies`: algoritmos de tarificación |
| Builder | `policies/application/builders/policy.builder.ts`: ensamblado validado del agregado `Policy` |
| State | `policies/domain/states`: un estado por clase con sus transiciones permitidas |
| Observer | Publicador de eventos (`EventPublisherPort` → adaptador Kafka) y consumers de auditoría y notificaciones |
| Singleton | `config/insurance-config.registry.ts`: provider con scope singleton del contenedor de DI de NestJS |

### Endpoints (prefijo `/api`)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/customers` | Crear cliente |
| GET | `/customers` | Listar clientes |
| GET | `/customers/:id` | Consultar cliente |
| POST | `/policies` | Emitir (cotizar) póliza |
| GET | `/policies` | Listar pólizas |
| GET | `/policies/:id` | Consultar póliza |
| GET | `/policies/customer/:customerId` | Pólizas de un cliente |
| PATCH | `/policies/:id/status` | Cambiar estado (`{ "targetStatus": "ACTIVE" }`) |

La documentación interactiva queda disponible en `http://localhost:3000/api/docs`.

## Cómo ejecutarlo

Requisitos: Node.js 24 (la versión del CI) y Docker.

```bash
cp .env.example .env
docker compose up -d        # PostgreSQL, Kafka y Kafka UI (http://localhost:8080)
npm install
npm run start:dev           # http://localhost:3000/api
```

Si ya tienes PostgreSQL instalado localmente en el puerto 5432, cambia `DB_PORT` en `.env` (por ejemplo a `5433`).

Al cambiar el estado de una póliza, los dos consumers registran el evento en el log:

```
[NotificationsConsumer] [NOTIFICATION] Policy POL-2026-000011 is now ACTIVE
[AuditConsumer] [AUDIT] policy=POL-2026-000011 | ISSUED → ACTIVE | customer=… | branch=HOME | at=…
```

Pruebas (no necesitan Docker):

```bash
npm test                  # toda la suite
npm run test:unit         # o test:integration, test:e2e, test:bdd
npm run test:cov          # con reporte de cobertura en coverage/
```

Ejemplo:

```bash
curl -X POST localhost:3000/api/customers -H "Content-Type: application/json" \
  -d '{"name":"Ana","email":"ana@example.com"}'

curl -X POST localhost:3000/api/policies -H "Content-Type: application/json" \
  -d '{"customerId":"<id>","branch":"AUTO","ratingStrategy":"RISK_BASED","riskProfile":{"riskScore":40}}'
```

## Calidad

La calidad se integra desde el primer commit (*shift-left*): cada push y cada pull request ejecutan lint sin warnings, typecheck, la suite completa con cobertura y el build en [GitHub Actions](.github/workflows/ci.yml). SonarCloud analiza el código con el reporte de cobertura de Jest.

### Pirámide de pruebas

| Nivel | Pruebas | Qué cubre | Dónde |
|---|---:|---|---|
| BDD (Gherkin en español) | 22 escenarios | Emisión, rechazos y ciclo de vida descritos como criterios de aceptación | `test/bdd/` |
| API / E2E | 17 | Los 8 endpoints con supertest: validación de DTOs, códigos 400/404/409 y formato de error | `test/e2e/` |
| Integración | 20 | Casos de uso con el cableado real de DI y adaptadores en memoria (ports & adapters) | `test/integration/` |
| Unitarias | 98 | Estrategias de tarificación, matriz de 25 transiciones, builder, factories, mappers y consumers | `src/**/*.spec.ts` |
| **Total** | **157** | | |

Cobertura de la última ejecución local (`npm run test:cov`): **94,38 %** de sentencias, **81,03 %** de ramas, **87,07 %** de funciones y **94,39 %** de líneas. Lo que no se cubre son los adaptadores que necesitan infraestructura real (repositorios TypeORM, publicador de Kafka y `AppModule`); el flujo con Kafka se verificó manualmente con Docker Compose.

Las historias de usuario (INVEST), sus criterios de aceptación y los edge cases están en [`docs/historias-usuario.md`](docs/historias-usuario.md), junto con los hallazgos abiertos.

### Pendientes conocidos

- TypeORM usa `synchronize: true` (solo apto para desarrollo; faltan migraciones).
- Los hallazgos H-01 a H-05 de [`docs/historias-usuario.md`](docs/historias-usuario.md#hallazgos-y-preguntas-abiertas): redondeo de la prima, rango de `customerSince`, idempotencia de `CANCELLED`, eventos perdidos si Kafka falla y concurrencia.
- Pruebas de los adaptadores contra PostgreSQL y Kafka reales (p. ej. con Testcontainers).

## Cómo usé IA

Trabajé con **Claude Code** como copiloto, revisando y ejecutando todo lo que proponía:

- **Escenarios Gherkin:** a partir del código y de las historias de usuario, Claude Code propuso los criterios de aceptación y los escenarios en español. Yo los revisé antes de automatizarlos con jest-cucumber.
- **Edge cases:** Claude Code los propuso y verificó cada límite ejecutando el código (`riskScore` 0 y 100, exactamente 2 años de antigüedad, transición al mismo estado). Así aparecieron los hallazgos H-01 a H-05, por ejemplo una prima de `128400.00000000001` por falta de redondeo.
- **Revisión de código:** detectó que los consumers de Kafka nunca recibían eventos (faltaba `connectMicroservice`), que `uuid` v14 no cargaba en Jest y que el lockfile generado en Windows rompía `npm ci` en Linux. Este último se confirmó simulando el pipeline en un contenedor `node:24`.

Las cifras de este README (conteos y cobertura) salen de ejecuciones reales de la suite, no de estimaciones.

## Contexto

Reto integrador de un proceso de formación en POO, SOLID, código limpio, arquitectura hexagonal y patrones de diseño. El enunciado está en [`CAPSTONE_CHALLENGE.md`](CAPSTONE_CHALLENGE.md). El frontend que consume esta API está en [insurance_policy_frontend](https://github.com/juanpa1601/insurance_policy_frontend).
