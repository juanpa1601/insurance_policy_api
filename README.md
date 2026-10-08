# Insurance Policy API

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
- **Eventos de dominio:** cada cambio de estado publica un evento en un topic de Kafka (`policy.issued`, `policy.activated`, `policy.suspended`, `policy.reactivated`, `policy.cancelled`).

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

Requisitos: Node.js 20 o superior y Docker.

```bash
cp .env.example .env
docker compose up -d        # PostgreSQL, Kafka y Kafka UI (http://localhost:8080)
npm install
npm run start:dev           # http://localhost:3000/api
```

Si ya tienes PostgreSQL instalado localmente en el puerto 5432, cambia `DB_PORT` en `.env` (por ejemplo a `5433`).

Ejemplo:

```bash
curl -X POST localhost:3000/api/customers -H "Content-Type: application/json" \
  -d '{"name":"Ana","email":"ana@example.com"}'

curl -X POST localhost:3000/api/policies -H "Content-Type: application/json" \
  -d '{"customerId":"<id>","branch":"AUTO","ratingStrategy":"RISK_BASED","riskProfile":{"riskScore":40}}'
```

## Estado actual y pendientes

- Probado localmente: creación de clientes y pólizas, cálculo de prima, transiciones de estado (válidas e inválidas) y publicación de eventos en los topics de Kafka.
- Los consumers de auditoría y notificaciones están implementados, pero `main.ts` todavía no conecta el microservicio de Kafka (`connectMicroservice`), así que hoy no reciben los eventos.
- TypeORM usa `synchronize: true` (solo apto para desarrollo; faltan migraciones).
- No hay pruebas automatizadas propias: `test/` conserva el e2e de ejemplo de NestJS.

## Contexto

Reto integrador de un proceso de formación en POO, SOLID, código limpio, arquitectura hexagonal y patrones de diseño. El enunciado está en [`CAPSTONE_CHALLENGE.md`](CAPSTONE_CHALLENGE.md). El frontend que consume esta API está en [insurance_policy_frontend](https://github.com/juanpa1601/insurance_policy_frontend).
