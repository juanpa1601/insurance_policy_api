import { 
  Inject, 
  Injectable 
} from '@nestjs/common';
import { Policy } from '../../domain/policy.entity';
import { PolicyStatus } from '../../domain/enums/policy-status.enum';
import type { PolicyRepositoryPort } from '../../domain/ports/policy.repository.port';
import type { PolicyStatePort } from '../../domain/states/policy-state.port';
import type { EventPublisherPort } from '../../../shared/events/domain/ports/event-publisher.port';
import { PolicyTopics } from '../../../shared/events/domain/policy-domain-event';
import { PolicyNotFoundException } from '../../domain/exceptions/policy-not-found.exception';

@Injectable()
export class ChangePolicyStatusUseCase {
  // El mapa de estados permite delegar la logica de transicion sin un switch.
  private readonly stateMap: Map<PolicyStatus, PolicyStatePort>;

  constructor(
    @Inject('PolicyRepositoryPort')
    private readonly policyRepository: PolicyRepositoryPort,
    @Inject('POLICY_STATES')
    states: PolicyStatePort[],
    @Inject('EventPublisherPort')
    private readonly eventPublisher: EventPublisherPort,
  ) {
    this.stateMap = new Map(states.map((s) => [s.getStatus(), s]));
  }

  async execute(
    policyId: string,
    targetStatus: PolicyStatus
  ): Promise<Policy> {
    // 1) Se busca la póliza en BD por su ID.
    //    Si no existe, se lanza PolicyNotFoundException (HTTP 404).
    const policy: Policy | null = await this.policyRepository.findById(policyId);
    if (!policy) throw new PolicyNotFoundException(policyId);

    // 2) Se obtiene el objeto de estado actual desde el Map (ej: QuotedState, ActiveState).
    //    Este objeto encapsula las transiciones válidas para ese estado.
    const currentState: PolicyStatePort = this.stateMap.get(policy.status)!;

    // 3) Se delega al estado actual la validación de la transición solicitada.
    //    Si la transición no está permitida, el estado lanza InvalidStateTransitionException (HTTP 400).
    //    Si targetStatus es igual al estado actual, retorna el mismo status (idempotente).
    const newStatus: PolicyStatus = currentState.transitionTo(targetStatus);

    // 4) Si la transición es idempotente (mismo estado), se retorna la póliza sin cambios
    //    y sin publicar ningún evento.
    if (newStatus === policy.status) return policy;

    // 5) Se crea una nueva instancia inmutable de la póliza con el estado actualizado.
    //    La cobertura y la prima mensual permanecen invariables.
    const updatedPolicy: Policy = policy.withStatus(newStatus);
    const saved: Policy = await this.policyRepository.save(updatedPolicy);

    // 6) Se resuelve el topic de Kafka correspondiente a la transición ejecutada
    //    y se publica el evento de dominio con el payload completo.
    //    Los consumers (NotificationsConsumer, AuditConsumer) reaccionan de forma independiente.
    const topic: string = this.resolveTopic(
      policy.status,
      newStatus
    );
    await this.eventPublisher.publish(topic, {
      policyId: saved.id,
      policyNumber: saved.policyNumber,
      customerId: saved.customerId,
      branch: saved.branch,
      oldStatus: policy.status,
      newStatus: saved.status,
      timestamp: new Date().toISOString(),
    });

    // 7) Se retorna la póliza con el nuevo estado persistido.
    return saved;
  }

  private resolveTopic(
    from: PolicyStatus, 
    to: PolicyStatus
  ): string {
    if (to === PolicyStatus.ISSUED) return PolicyTopics.ISSUED;
    if (to === PolicyStatus.ACTIVE && from === PolicyStatus.SUSPENDED) return PolicyTopics.REACTIVATED;
    if (to === PolicyStatus.ACTIVE) return PolicyTopics.ACTIVATED;
    if (to === PolicyStatus.SUSPENDED) return PolicyTopics.SUSPENDED;
    return PolicyTopics.CANCELLED;
  }
}
