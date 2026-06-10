import { PolicyStatus } from '../enums/policy-status.enum';

// Contrato que todos los estados de la poliza deben cumplir.
export interface PolicyStatePort {
  getStatus(): PolicyStatus;
  // Retorna el nuevo status si la transicion es valida.
  // Lanza InvalidStateTransitionException si no lo es.
  // Es idempotente: transicionar al estado actual retorna el mismo status.
  transitionTo(target: PolicyStatus): PolicyStatus;
}
