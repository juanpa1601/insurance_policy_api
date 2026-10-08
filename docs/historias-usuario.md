# Historias de usuario

Historias en formato INVEST para las dos capacidades centrales de la API: la emisión (cotización) de pólizas y el cambio de estado. Cada historia incluye criterios de aceptación y edge cases.

Cómo se generaron: los criterios y los edge cases los propuso Claude Code a partir de una lectura del código (estrategias, máquina de estados, DTOs y casos de uso). Luego se verificaron ejecutando el código real. Los comportamientos dudosos que aparecieron en esa revisión quedan en la sección [Hallazgos y preguntas abiertas](#hallazgos-y-preguntas-abiertas) y no se convirtieron en criterios de aceptación.

Trazabilidad: los escenarios marcados con **[BDD]** están automatizados en `test/bdd/features/`. El resto queda cubierto por las pruebas unitarias, de integración o e2e.

---

## HU-01: Cotizar una póliza con la estrategia de tarificación adecuada

> **Como** asesor comercial
> **quiero** cotizar una póliza para un cliente activo eligiendo el ramo y la estrategia de tarificación
> **para** informarle la prima mensual y la cobertura antes de emitirla.

### Criterios de aceptación

| # | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-01.1 | un cliente activo | cotizo un ramo con estrategia `STANDARD` | la póliza queda en `QUOTED` y la prima es la prima base del ramo **[BDD]** |
| CA-01.2 | un cliente activo | cotizo con `RISK_BASED` y un `riskScore` entre 0 y 100 | la prima es `base × (1 + riskScore/100)` **[BDD]** |
| CA-01.3 | un cliente con al menos 2 años de antigüedad | cotizo con `LOYALTY` | la prima tiene 15 % de descuento sobre la base **[BDD]** |
| CA-01.4 | cualquier ramo | se cotiza | la cobertura por defecto es la del ramo (monto, plazo, deducible, etc.) |
| CA-01.5 | dos cotizaciones seguidas | se emiten | reciben números consecutivos `POL-AAAA-NNNNNN` **[BDD]** |

Primas base: AUTO 120.000 · LIFE 90.000 · HOME 75.000 · HEALTH 180.000 · TRAVEL 65.000.

### Edge cases

| Caso | Resultado esperado | Dónde se prueba |
|---|---|---|
| `riskScore` = 0 o 100 (límites) | Válido: prima ×1 o ×2 | unit **[BDD]** |
| `riskScore` = -1 o 101 | 400 (dominio); 150 se rechaza en el DTO | unit, e2e |
| `RISK_BASED` sin `riskScore` | 400 `InvalidRatingStrategyDataException` **[BDD]** | unit, e2e |
| `LOYALTY` con exactamente 2 años | Válido (límite inclusivo) | unit **[BDD]** |
| `LOYALTY` con 1 año o con un año futuro | 400, sin persistir la póliza **[BDD]** | unit, integración |
| `LOYALTY` sin `customerSince` | 400 | unit |
| `riskScore` enviado con `STANDARD` | Se guarda en el perfil, pero no altera la prima | sonda manual |
| Cliente inexistente o inactivo | 404 `CustomerNotFoundException` **[BDD]** | integración, e2e |
| `customerId` que no es UUID, ramo o estrategia desconocidos | 400 por validación del DTO | e2e |
| Reinicio de la app | La secuencia continúa desde el máximo número guardado | integración |

### INVEST

| Criterio | Cumple |
|---|---|
| **I**ndependiente | Solo depende de que exista el cliente, no de otras historias de pólizas. |
| **N**egociable | Las primas base y el factor de lealtad están centralizados en `InsuranceConfigRegistry`. |
| **V**aliosa | El asesor obtiene la prima y la cobertura para ofrecerlas. |
| **E**stimable | Alcance acotado a 5 ramos × 3 estrategias. |
| **S**mall | Un endpoint (`POST /api/policies`) y un caso de uso. |
| **T**estable | Reglas numéricas exactas y códigos HTTP definidos. |

---

## HU-02: Gestionar el ciclo de vida de una póliza

> **Como** asesor comercial
> **quiero** cambiar el estado de una póliza siguiendo las reglas del negocio
> **para** reflejar su emisión, activación, suspensión o cancelación y avisar a los sistemas interesados.

### Criterios de aceptación

| # | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-02.1 | una póliza en un estado | solicito una transición permitida | el estado cambia y se publica el evento correspondiente **[BDD]** |
| CA-02.2 | una póliza en un estado | solicito una transición no permitida | responde 400, el estado no cambia y no se publica ningún evento **[BDD]** |
| CA-02.3 | una póliza `SUSPENDED` | la paso a `ACTIVE` | se publica `policy.reactivated`, no `policy.activated` **[BDD]** |
| CA-02.4 | una póliza `CANCELLED` | solicito cualquier transición | responde 400: es un estado terminal **[BDD]** |
| CA-02.5 | una póliza | cambia de estado | la prima y la cobertura no cambian |

Transiciones permitidas:

```
QUOTED    → ISSUED | CANCELLED
ISSUED    → ACTIVE | CANCELLED
ACTIVE    → SUSPENDED | CANCELLED
SUSPENDED → ACTIVE | CANCELLED
CANCELLED → (ninguna)
```

Eventos: `policy.issued`, `policy.activated`, `policy.suspended`, `policy.reactivated` y `policy.cancelled`. Los consumen `AuditConsumer` y `NotificationsConsumer`.

### Edge cases

| Caso | Resultado esperado | Dónde se prueba |
|---|---|---|
| Transición al mismo estado (p. ej. `ACTIVE → ACTIVE`) | Idempotente: 200 sin guardar ni publicar **[BDD]** | unit, integración |
| `CANCELLED → CANCELLED` | 400 (ver hallazgo H-03) | unit **[BDD]** |
| Saltar estados (`QUOTED → ACTIVE`) | 400 sin evento **[BDD]** | unit, integración, e2e |
| Estado inexistente (`EXPIRED`) | 400 por validación del DTO | e2e |
| Póliza inexistente | 404 `PolicyNotFoundException` | integración, e2e |
| Ciclo completo emitir → activar → suspender → reactivar → cancelar | 5 eventos en orden | integración, demo con Docker |

### INVEST

| Criterio | Cumple |
|---|---|
| **I**ndependiente | Requiere una póliza existente, pero no depende de cómo se tarificó. |
| **N**egociable | Las transiciones viven en una clase por estado y se pueden ajustar sin tocar el caso de uso. |
| **V**aliosa | Refleja el estado real de la póliza e informa a auditoría y notificaciones. |
| **E**stimable | Matriz cerrada de 5 × 5 transiciones. |
| **S**mall | Un endpoint (`PATCH /api/policies/:id/status`). |
| **T**estable | Cada par de estados tiene un resultado esperado y un topic definido. |

---

## Hallazgos y preguntas abiertas

Comportamientos encontrados al generar los edge cases, verificados ejecutando el código. Se documentan para decidirlos con negocio; no se cambiaron en esta iteración.

| # | Hallazgo | Evidencia | Propuesta |
|---|---|---|---|
| H-01 | La prima no se redondea y arrastra errores de coma flotante. | `RISK_BASED` con `riskScore: 7` sobre AUTO devuelve `128400.00000000001`. | Redondear a la unidad monetaria al calcular, o manejar centavos como enteros. |
| H-02 | `customerSince` no tiene límite inferior: con `1800` la póliza se emite con descuento de lealtad. `customerSince: 0` se trata como ausente. | Sonda sobre `CreatePolicyUseCase`. | Validar un rango en el DTO (p. ej., desde el año de fundación de la aseguradora hasta el año actual). |
| H-03 | `CANCELLED → CANCELLED` responde 400, mientras que en los demás estados la transición al mismo estado es idempotente. | `CancelledState.transitionTo` siempre lanza la excepción. | Decidir si cancelar dos veces debe ser idempotente (200) para ser coherente con los demás estados. |
| H-04 | Si Kafka falla al publicar, el cambio de estado ya quedó guardado y el evento se pierde sin error visible. | `KafkaEventPublisherAdapter.publish` no espera la confirmación de `emit`. | Patrón *transactional outbox*, o al menos registrar el error. |
| H-05 | No hay control de concurrencia: dos cambios de estado simultáneos sobre la misma póliza pueden pisarse. | No hay versión ni bloqueo en `PolicyOrmEntity`. | Bloqueo optimista con `@VersionColumn`. |
