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
    // Busca la poliza; si no existe, lanza una excepcion
    const policy: Policy | null = await this.policyRepository.findById(policyId);
    if (!policy) throw new PolicyNotFoundException(policyId);
    // Obtiene el estado actual de la poliza
    const currentState: PolicyStatePort = this.stateMap.get(policy.status)!;

    // State: delega la validacion al estado actual; lanza si la transicion es invalida
    const newStatus: PolicyStatus = currentState.transitionTo(targetStatus);

    // Si la transicion es idempotente, retorna sin modificar ni publicar evento
    if (newStatus === policy.status) return policy;

    const updatedPolicy: Policy = policy.withStatus(newStatus);
    const saved: Policy = await this.policyRepository.save(updatedPolicy);

    // Observer: publica el evento correspondiente a la transicion
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
