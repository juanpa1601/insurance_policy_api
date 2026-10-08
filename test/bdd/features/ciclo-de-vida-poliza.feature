# language: es
Característica: Ciclo de vida de la póliza
  Como asesor comercial
  quiero cambiar el estado de una póliza siguiendo las reglas del negocio
  para reflejar su situación real y avisar a auditoría y notificaciones

  Esquema del escenario: Transiciones permitidas publican su evento
    Dada una póliza en estado <origen>
    Cuando solicito cambiarla a <destino>
    Entonces la póliza queda en estado <destino>
    Y se publica el evento "<evento>"

    Ejemplos:
      | origen    | destino   | evento             |
      | QUOTED    | ISSUED    | policy.issued      |
      | QUOTED    | CANCELLED | policy.cancelled   |
      | ISSUED    | ACTIVE    | policy.activated   |
      | ACTIVE    | SUSPENDED | policy.suspended   |
      | SUSPENDED | ACTIVE    | policy.reactivated |
      | ACTIVE    | CANCELLED | policy.cancelled   |

  Esquema del escenario: Transiciones no permitidas se rechazan sin efectos
    Dada una póliza en estado <origen>
    Cuando solicito cambiarla a <destino>
    Entonces la solicitud se rechaza por transición no permitida
    Y la póliza sigue en estado <origen>
    Y no se publica ningún evento

    Ejemplos:
      | origen    | destino   |
      | QUOTED    | ACTIVE    |
      | ISSUED    | SUSPENDED |
      | CANCELLED | ACTIVE    |
      | CANCELLED | CANCELLED |

  Escenario: Repetir el estado actual es idempotente
    Dada una póliza en estado ACTIVE
    Cuando solicito cambiarla a ACTIVE
    Entonces la póliza queda en estado ACTIVE
    Y no se publica ningún evento
