import { Test, TestingModule } from '@nestjs/testing';
import { CUSTOMER_APPLICATION_PROVIDERS } from '../../src/customers/customers.module';
import { CustomersController } from '../../src/customers/infrastructure/http/customers.controller';
import { PoliciesController } from '../../src/policies/infrastructure/http/policies.controller';
import { POLICY_APPLICATION_PROVIDERS } from '../../src/policies/policies.module';
import {
  InMemoryCustomerRepository,
  InMemoryPolicyRepository,
  RecordingEventPublisher,
} from './in-memory-adapters';

export interface TestAdapters {
  customers: InMemoryCustomerRepository;
  policies: InMemoryPolicyRepository;
  events: RecordingEventPublisher;
}

export const createAdapters = (): TestAdapters => ({
  customers: new InMemoryCustomerRepository(),
  policies: new InMemoryPolicyRepository(),
  events: new RecordingEventPublisher(),
});

// Compone la aplicación con el mismo cableado de DI que los módulos de
// producción, pero con los adaptadores en memoria en lugar de TypeORM y Kafka.
export const createTestingModule = (
  adapters: TestAdapters,
  { withControllers = false } = {},
): Promise<TestingModule> =>
  Test.createTestingModule({
    controllers: withControllers
      ? [CustomersController, PoliciesController]
      : [],
    providers: [
      ...CUSTOMER_APPLICATION_PROVIDERS,
      ...POLICY_APPLICATION_PROVIDERS,
      { provide: 'CustomerRepositoryPort', useValue: adapters.customers },
      { provide: 'PolicyRepositoryPort', useValue: adapters.policies },
      { provide: 'EventPublisherPort', useValue: adapters.events },
    ],
  }).compile();
