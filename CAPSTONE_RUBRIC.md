# Rúbrica de Evaluación — Reto Integrador (Insurance API)

**Total:** 100 puntos · **Bonus:** +6 (Singleton) · **Aprobación:** ≥ 70 puntos

Cada ítem es verificable leyendo el código o ejecutando la aplicación. Cuando un ítem esté parcialmente cumplido, otorga la fracción proporcional (p.ej. 3 de 4 factories correctas en E → 7.5 de 10).

> **Distribución del foco:** fundamentos (POO + SOLID + código limpio) = **28 pts**; patrones de diseño = **54 pts**; arquitectura, persistencia y API = **18 pts**. Una entrega que funciona pero donde los patrones "existen solo en el nombre" **no aprueba**.

---

## A. Pilares de la POO — 10 pts

| Pts | Criterio |
|---|---|
| 3 | **Encapsulamiento**: el estado del dominio no se expone con setters públicos arbitrarios; los Value Objects (`coverage`, `riskProfile`) son inmutables; las invariantes se protegen dentro del agregado. |
| 3 | **Polimorfismo**: factories, estrategias y estados se usan a través de su abstracción (el use case nunca pregunta el tipo concreto con `instanceof`/`typeof`). |
| 2 | **Abstracción**: las interfaces/clases abstractas (`*Port`) modelan el contrato, no el detalle; el dominio expresa el negocio, no la tecnología. |
| 2 | **Herencia/composición usada con criterio**: jerarquías solo donde hay relación "es-un" real (LSP); preferencia por composición cuando aplica. Sin herencia decorativa. |

## B. Principios SOLID — 10 pts

| Pts | Criterio |
|---|---|
| 2 | **SRP**: cada clase tiene una sola razón de cambio (factory ≠ strategy ≠ state ≠ use case ≠ mapper). |
| 2 | **OCP**: agregar un ramo o una estrategia = clase nueva + registro, **sin** modificar use cases. Verificable mentalmente. |
| 2 | **LSP**: cualquier estado/estrategia/factory concreta es sustituible por su port sin romper el caller. |
| 2 | **ISP**: los ports son pequeños y cohesionados; no hay interfaces "gordas" que obliguen a implementar métodos vacíos. |
| 2 | **DIP**: los use cases dependen de abstracciones (`*Port`) inyectadas; **ningún `new`** de repos/factories/strategies/publishers dentro de ellos. |

## C. Código limpio — 8 pts

| Pts | Criterio |
|---|---|
| 2 | Nombres reveladores y consistentes en el dominio de seguros (sin restos de "bank"/"transfer"/"product"). |
| 2 | Funciones/métodos pequeños y con un solo nivel de abstracción; sin duplicación evidente (DRY). |
| 2 | Sin números mágicos: las primas base, factores y umbrales viven en constantes/configuración con nombre, no incrustados. |
| 2 | Manejo de errores claro con excepciones de dominio; sin `catch` vacíos, sin código muerto, sin comentarios que tapan mal código. |

## D. Arquitectura Hexagonal — 8 pts

| Pts | Criterio |
|---|---|
| 3 | Cada módulo con `domain/`, `application/`, `infrastructure/` bien delimitadas. |
| 3 | `domain/` **no importa** ORM, cliente del broker ni HTTP/framework (grep lo confirma). |
| 2 | Ports en `domain/ports`, estados en `domain/states`; implementaciones de infraestructura en `infrastructure/`. |

## E. Factory Method — 10 pts

| Pts | Criterio |
|---|---|
| 3 | `PolicyFactoryPort` con `getBranch()` y `createDefaultCoverage()`. |
| 5 | Las 4 factories producen la **cobertura exacta** del reto (1.25 c/u — montos y campos correctos por ramo). |
| 2 | Selección por `Map`/registro/provider, **sin `switch (branch)`** en el use case. |

## F. Builder — 8 pts

| Pts | Criterio |
|---|---|
| 3 | `PolicyBuilder` fluido (cada setter retorna `this`) ensambla el agregado. |
| 3 | `build()` valida campos obligatorios y asigna `QUOTED` como estado inicial. |
| 2 | El use case delega la construcción multi-paso en el Builder (no arma el agregado campo por campo). |

## G. State — 12 pts

| Pts | Criterio |
|---|---|
| 3 | `PolicyStatePort` + **una clase por estado** (`Quoted`, `Issued`, `Active`, `Suspended`, `Cancelled`). |
| 5 | Transiciones **exactas** del reto (1.25 por estado no terminal): `QUOTED→{ISSUED,CANCELLED}`, `ISSUED→{ACTIVE,CANCELLED}`, `ACTIVE→{SUSPENDED,CANCELLED}`, `SUSPENDED→{ACTIVE,CANCELLED}`. |
| 2 | `CANCELLED` terminal; transición desde él → 400. |
| 2 | El use case **no** contiene la matriz de transiciones; delega en el estado actual. |

## H. Strategy — 12 pts

| Pts | Criterio |
|---|---|
| 3 | `RatingStrategyPort` con `getName()`, `validate()` y `calculatePremium()`. |
| 6 | Las 3 estrategias calculan la prima **exacta** del reto (2 c/u): `STANDARD` (base), `RISK_BASED` (base × (1+riskScore/100)), `LOYALTY` (base × 0.85 con antigüedad ≥ 2 años). Validaciones específicas presentes. |
| 2 | Selección por `Map`/registro, **sin `switch`/`if` por estrategia** en el use case. |
| 1 | Factory y Strategy son clases **separadas** (no se mezcla "qué cobertura" con "cómo se cobra"). |

## I. Observer con broker — 10 pts

| Pts | Criterio |
|---|---|
| 3 | `EventPublisher` como port; adapter del broker en `infrastructure/`. |
| 3 | Topics correctos por transición (`policy.issued`, `policy.activated`, `policy.suspended`, `policy.reactivated`, `policy.cancelled`). |
| 3 | **Dos consumers independientes** (`Notifications`, `Audit`) suscritos, con responsabilidades distintas. |
| 1 | Payload con `policyId`, `oldStatus`, `newStatus`, `timestamp` y datos de negocio. |

## J. Persistencia y Mapper — 6 pts

| Pts | Criterio |
|---|---|
| 2 | ORM real contra BD real (nada in-memory). |
| 2 | Entidad ORM separada del modelo de dominio; `Mapper` bidireccional. |
| 1 | `coverage`/`riskProfile` como JSON/JSONB y Value Object en dominio; `id` UUID, `policyNumber` único, timestamps. |
| 1 | El repositorio implementa el port del dominio. |

## K. API, validación y Swagger — 6 pts

| Pts | Criterio |
|---|---|
| 2 | Endpoints funcionan con los códigos HTTP correctos (201, 200, 400, 404, 409). |
| 2 | DTOs con validación declarativa + excepciones de dominio mapeadas vía filtro. |
| 2 | **Swagger/OpenAPI** en `/api/docs` con schemas de request y response. |

---

## Bonus — Singleton (investigación) — +6 pts

| Pts | Criterio |
|---|---|
| 2 | Aplica el Singleton a un recurso que **genuinamente** debe ser único (`PolicyNumberSequencer` o `InsuranceConfigRegistry`), no a algo arbitrario. |
| 2 | Garantiza la unicidad de forma correcta en su lenguaje/framework (o justifica el uso del **scope singleton del contenedor de DI** como alternativa preferida). |
| 2 | El `README` explica **por qué** amerita Singleton, **cómo** lo implementó y **qué riesgo** del patrón mitigó (estado global, testabilidad). |

> El bonus puede compensar puntos perdidos en otros bloques, hasta un máximo de 100 en la nota final.

---

## Checklist de verificación en vivo (≈ 20 min por entrega)

1. **Arranque**
   - [ ] `docker-compose up -d` → BD y broker sin errores; Swagger en `/api/docs`.

2. **Creación (Factory + Strategy + Builder)**
   - [ ] `AUTO` + `STANDARD` → 201, `QUOTED`, `coverageAmount` 80 000 000, `monthlyPremium` 120 000.
   - [ ] `LIFE` + `RISK_BASED` con `riskScore` 50 → 201, `monthlyPremium` 90 000 × 1.5 = 135 000.
   - [ ] `HOME` + `LOYALTY` con `customerSince` ≥ 2 años → 201, `monthlyPremium` 75 000 × 0.85 = 63 750.
   - [ ] `HEALTH` + `STANDARD` → 201, `copayRate` 0.20, `waitingPeriodDays` 30.
   - [ ] Ramo inexistente → 400; `RISK_BASED` sin `riskScore` → 400; `LOYALTY` con antigüedad < 2 años → 400.

3. **Ciclo de vida (State)**
   - [ ] `QUOTED→ISSUED→ACTIVE→SUSPENDED→ACTIVE→CANCELLED` → cada paso 200 + su evento.
   - [ ] Sobre `CANCELLED`, cualquier transición → 400.
   - [ ] Salto `QUOTED→ACTIVE` → 400.

4. **Eventos**
   - [ ] UI del broker: topics `policy.*` con mensajes; logs muestran **ambos** consumers.

5. **Auditoría de código (grep)**
   - [ ] `PolicyFactoryPort`, `RatingStrategyPort`, `PolicyStatePort` en `domain/`.
   - [ ] Use case de creación sin `switch (branch)` ni `switch (ratingStrategy)`; use case de estado sin matriz de transiciones.
   - [ ] `domain/` sin imports de ORM/broker.
   - [ ] OCP: agregar ramo/estrategia = una clase nueva + registro.
   - [ ] Singleton: una sola instancia real del recurso elegido.

---

## Tabla de calificación final

| Rango | Calificación |
|---|---|
| 90 – 100 | Excelente — domina fundamentos y patrones; sirve como referencia. |
| 80 – 89 | Muy bien — todo aplicado correctamente, detalles menores. |
| 70 – 79 | Aprobado — cumple lo esencial, con áreas concretas de mejora. |
| 60 – 69 | Cerca — retroalimentar y solicitar correcciones puntuales. |
| < 60 | No aprobado — falta comprensión de al menos un pilar (POO/SOLID, hexagonal, o uno de los patrones núcleo). |

---

## Señales de alarma (copy/paste sin entender)

- Nombres, comentarios, logs o topics que aún mencionan "bank", "transfer", "product", "account", "card".
- Máquina de **4** estados (la del banco) en lugar de los **5** del reto (falta `ISSUED`).
- Factory y Strategy fusionadas en una sola clase (confunde "qué cobertura" con "cómo se cobra").
- Números mágicos del banco (`creditLimit`, `dailyWithdrawalLimit`) en vez de los del reto.
- Patrón "en el nombre": `*Strategy`/`*State`/`*Factory` que en realidad se seleccionan con un `switch` en el use case → **0 crédito** en ese ítem.
- Singleton aplicado a algo que no necesita ser único (un mapper, un DTO) o que rompe la testabilidad sin justificarlo.