import { Customer } from '../../src/customers/domain/customer.entity';
import type { CustomerRepositoryPort } from '../../src/customers/domain/ports/customer.repository.port';
import { Policy } from '../../src/policies/domain/policy.entity';
import type { PolicyRepositoryPort } from '../../src/policies/domain/ports/policy.repository.port';
import { PolicyDomainEvent } from '../../src/shared/events/domain/policy-domain-event';
import type { EventPublisherPort } from '../../src/shared/events/domain/ports/event-publisher.port';

// Adaptadores en memoria que implementan los mismos ports que TypeORM y Kafka.
// Permiten probar los casos de uso y la API sin PostgreSQL ni broker.

export class InMemoryCustomerRepository implements CustomerRepositoryPort {
  private readonly customers = new Map<string, Customer>();

  save(customer: Customer): Promise<Customer> {
    this.customers.set(customer.id, customer);
    return Promise.resolve(customer);
  }

  findById(id: string): Promise<Customer | null> {
    return Promise.resolve(this.customers.get(id) ?? null);
  }

  findByEmail(email: string): Promise<Customer | null> {
    const found = [...this.customers.values()].find((c) => c.email === email);
    return Promise.resolve(found ?? null);
  }

  findAll(): Promise<Customer[]> {
    return Promise.resolve([...this.customers.values()]);
  }
}

export class InMemoryPolicyRepository implements PolicyRepositoryPort {
  private readonly policies = new Map<string, Policy>();
  saveCount = 0;

  save(policy: Policy): Promise<Policy> {
    this.saveCount++;
    this.policies.set(policy.id, policy);
    return Promise.resolve(policy);
  }

  findById(id: string): Promise<Policy | null> {
    return Promise.resolve(this.policies.get(id) ?? null);
  }

  findByCustomerId(customerId: string): Promise<Policy[]> {
    return Promise.resolve(
      [...this.policies.values()].filter((p) => p.customerId === customerId),
    );
  }

  findAll(): Promise<Policy[]> {
    return Promise.resolve([...this.policies.values()]);
  }

  // Misma regla que el adaptador TypeORM: el máximo del tercer segmento de
  // POL-AAAA-NNNNNN, o 0 si no hay pólizas.
  findMaxSequence(): Promise<number> {
    const sequences = [...this.policies.values()].map((p) =>
      parseInt(p.policyNumber.split('-')[2], 10),
    );
    return Promise.resolve(sequences.length ? Math.max(...sequences) : 0);
  }
}

export interface PublishedEvent {
  topic: string;
  event: PolicyDomainEvent;
}

export class RecordingEventPublisher implements EventPublisherPort {
  readonly published: PublishedEvent[] = [];

  publish(topic: string, event: PolicyDomainEvent): Promise<void> {
    this.published.push({ topic, event });
    return Promise.resolve();
  }

  topics(): string[] {
    return this.published.map((p) => p.topic);
  }
}

export const activeCustomer = (
  overrides: Partial<ConstructorParameters<typeof Customer>[0]> = {},
): Customer =>
  new Customer({
    id: '6f1c2b8e-1d2a-4c3b-9e4f-5a6b7c8d9e0f',
    name: 'Ana Torres',
    email: 'ana@example.com',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });
