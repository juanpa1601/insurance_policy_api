import { TestingModule } from '@nestjs/testing';
import { Customer } from '../../src/customers/domain/customer.entity';
import { ChangePolicyStatusUseCase } from '../../src/policies/application/use-cases/change-policy-status.use-case';
import { CreatePolicyUseCase } from '../../src/policies/application/use-cases/create-policy.use-case';
import { Branch } from '../../src/policies/domain/enums/branch.enum';
import { PolicyStatus } from '../../src/policies/domain/enums/policy-status.enum';
import { RatingStrategyType } from '../../src/policies/domain/enums/rating-strategy-type.enum';
import { Policy } from '../../src/policies/domain/policy.entity';
import { activeCustomer } from '../support/in-memory-adapters';
import {
  createAdapters,
  createTestingModule,
  TestAdapters,
} from '../support/testing-module';

// Contexto compartido entre los pasos de un escenario. Usa los casos de uso
// reales con los adaptadores en memoria (igual que las pruebas de integración).
export class PolicyWorld {
  adapters!: TestAdapters;
  moduleRef!: TestingModule;
  customer!: Customer;
  policies: Policy[] = [];
  error?: Error;

  async start(): Promise<void> {
    this.adapters = createAdapters();
    this.moduleRef = await createTestingModule(this.adapters);
    await this.moduleRef.init();
    this.customer = activeCustomer();
    this.policies = [];
    this.error = undefined;
  }

  stop(): Promise<void> {
    return this.moduleRef.close();
  }

  get lastPolicy(): Policy {
    return this.policies[this.policies.length - 1];
  }

  async registerCustomer(customer: Customer): Promise<void> {
    this.customer = customer;
    await this.adapters.customers.save(customer);
  }

  async quote(
    branch: string,
    strategy: string,
    profile: string,
  ): Promise<void> {
    try {
      const policy = await this.moduleRef.get(CreatePolicyUseCase).execute({
        customerId: this.customer.id,
        branch: branch as Branch,
        ratingStrategy: strategy as RatingStrategyType,
        riskProfile: parseProfile(profile),
      });
      this.policies.push(policy);
    } catch (error) {
      this.error = error as Error;
    }
  }

  // Lleva una póliza recién cotizada hasta el estado pedido por el camino
  // válido más corto y descarta los eventos generados en el proceso.
  async policyIn(status: PolicyStatus): Promise<void> {
    await this.registerCustomer(activeCustomer());
    await this.quote('AUTO', 'STANDARD', 'sin datos');
    for (const step of PATH_TO[status]) {
      await this.changeStatus(step);
    }
    this.adapters.events.published.length = 0;
  }

  async changeStatus(target: PolicyStatus): Promise<void> {
    try {
      const updated = await this.moduleRef
        .get(ChangePolicyStatusUseCase)
        .execute(this.lastPolicy.id, target);
      this.policies.push(updated);
    } catch (error) {
      this.error = error as Error;
    }
  }

  async storedStatus(): Promise<PolicyStatus | undefined> {
    const stored = await this.adapters.policies.findById(this.lastPolicy.id);
    return stored?.status;
  }
}

const PATH_TO: Record<PolicyStatus, PolicyStatus[]> = {
  [PolicyStatus.QUOTED]: [],
  [PolicyStatus.ISSUED]: [PolicyStatus.ISSUED],
  [PolicyStatus.ACTIVE]: [PolicyStatus.ISSUED, PolicyStatus.ACTIVE],
  [PolicyStatus.SUSPENDED]: [
    PolicyStatus.ISSUED,
    PolicyStatus.ACTIVE,
    PolicyStatus.SUSPENDED,
  ],
  [PolicyStatus.CANCELLED]: [PolicyStatus.CANCELLED],
};

// "sin datos" | "riskScore N" | "cliente desde hace N años"
function parseProfile(profile: string): {
  riskScore?: number;
  customerSince?: number;
} {
  const risk = /^riskScore (\d+)$/.exec(profile);
  if (risk) return { riskScore: Number(risk[1]) };

  const loyalty = /^cliente desde hace (\d+) años$/.exec(profile);
  if (loyalty) {
    return { customerSince: new Date().getFullYear() - Number(loyalty[1]) };
  }

  if (profile === 'sin datos') return {};
  throw new Error(`Perfil de riesgo no reconocido en el feature: ${profile}`);
}
