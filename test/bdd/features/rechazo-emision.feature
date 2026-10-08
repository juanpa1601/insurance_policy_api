# language: es
Característica: Rechazo de cotizaciones inválidas
  Como asesor comercial
  quiero que el sistema rechace las cotizaciones que no cumplen las reglas
  para no ofrecer primas calculadas con datos incompletos o a clientes no válidos

  Esquema del escenario: La estrategia exige datos del perfil de riesgo
    Dado un cliente activo
    Cuando cotizo una póliza del ramo AUTO con la estrategia <estrategia> y el perfil <perfil>
    Entonces la cotización se rechaza con el error "<error>"
    Y no se guarda ninguna póliza

    Ejemplos:
      | estrategia | perfil                    | error                                                             |
      | RISK_BASED | sin datos                 | riskProfile.riskScore is required for RISK_BASED strategy         |
      | LOYALTY    | cliente desde hace 1 años | Customer must have at least 2 years as a customer for LOYALTY strategy (has 1) |

  Escenario: Un cliente inactivo no puede cotizar
    Dado un cliente inactivo
    Cuando cotizo una póliza del ramo AUTO con la estrategia STANDARD y el perfil sin datos
    Entonces la cotización se rechaza con el error "was not found"
    Y no se guarda ninguna póliza

  Escenario: Un cliente inexistente no puede cotizar
    Dado que el cliente no existe
    Cuando cotizo una póliza del ramo AUTO con la estrategia STANDARD y el perfil sin datos
    Entonces la cotización se rechaza con el error "was not found"
    Y no se guarda ninguna póliza
