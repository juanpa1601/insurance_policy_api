import { PolicyDomainEvent } from '../policy-domain-event';

export interface EventPublisherPort {
  publish(topic: string, event: PolicyDomainEvent): Promise<void>;
}
