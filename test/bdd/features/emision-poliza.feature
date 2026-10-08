# language: es
Característica: Emisión (cotización) de pólizas
  Como asesor comercial
  quiero cotizar una póliza eligiendo ramo y estrategia de tarificación
  para informar al cliente la prima mensual antes de emitirla

  Esquema del escenario: La prima depende de la estrategia de tarificación
    Dado un cliente activo
    Cuando cotizo una póliza del ramo <ramo> con la estrategia <estrategia> y el perfil <perfil>
    Entonces la póliza queda en estado QUOTED
    Y la prima mensual es <prima>

    Ejemplos:
      | ramo   | estrategia | perfil                   | prima  |
      | AUTO   | STANDARD   | sin datos                | 120000 |
      | HEALTH | STANDARD   | sin datos                | 180000 |
      | AUTO   | RISK_BASED | riskScore 0              | 120000 |
      | AUTO   | RISK_BASED | riskScore 40             | 168000 |
      | HOME   | RISK_BASED | riskScore 100            | 150000 |
      | LIFE   | LOYALTY    | cliente desde hace 2 años | 76500  |

  Escenario: Las pólizas reciben números consecutivos
    Dado un cliente activo
    Cuando cotizo dos pólizas seguidas
    Entonces los números de póliza terminan en 000001 y 000002
