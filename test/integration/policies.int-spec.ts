import { TestingModule } from '@nestjs/testing';
import { CustomerNotFoundException } from '../../src/customers/domain/exceptions/customer-not-found.exception';
import { PolicyBuilder } from '../../src/policies/application/builders/policy.builder';
import { ChangePolicyStatusUseCase } from '../../src/policies/application/use-cases/change-policy-status.use-case';
import {
  CreatePolicyCommand,
  CreatePolicyUseCase,
} from '../../src/policies/application/use-cases/create-policy.use-case';
import { GetAllPoliciesUseCase } from '../../src/policies/application/use-cases/get-all-policies.use-case';
import { GetPoliciesByCustomerUseCase } from '../../src/policies/application/use-cases/get-policies-by-customer.use-case';
import { GetPolicyUseCase } from '../../src/policies/application/use-cases/get-policy.use-case';
import { Branch } from '../../src/policies/domain/enums/branch.enum';
import { PolicyStatus } from '../../src/policies/domain/enums/policy-status.enum';
import { RatingStrategyType } from '../../src/policies/domain/enums/rating-strategy-type.enum';
import { InvalidRatingStrategyDataException } from '../../src/policies/domain/exceptions/invalid-rating-strategy-data.exception';
import { InvalidStateTransitionException } from '../../src/policies/domain/exceptions/invalid-state-transition.exception';
import { PolicyNotFoundException } from '../../src/policies/domain/exceptions/policy-not-found.exception';
import { UnsupportedBranchException } from '../../src/policies/domain/exceptions/unsupported-branch.exception';
import { UnsupportedRatingStrategyException } from '../../src/policies/domain/exceptions/unsupported-rating-strategy.exception';
import { Coverage } from '../../src/policies/domain/value-objects/coverage.vo';
import { RiskProfile } from '../../src/policies/domain/value-objects/risk-profile.vo';
import { activeCustomer } from '../support/in-memory-adapters';
import {
  createAdapters,
  createTestingModule,
  TestAdapters,
} from '../support/testing-module';

const YEAR = new Date().getFullYear();

describe('Casos de uso de pólizas (integración con adaptadores en memoria)', () => {
  let adapters: TestAdapters;
  let moduleRef: TestingModule;
  let createPolicy: CreatePolicyUseCase;
  let changeStatus: ChangePolicyStatusUseCase;

  const customer = activeCustomer();
  const command = (
    overrides: Partial<CreatePolicyCommand> = {},
  ): CreatePolicyCommand => ({
    customerId: customer.id,
    branch: Branch.AUTO,
    ratingStrategy: RatingStrategyType.STANDARD,
    riskProfile: {},
    ...overrides,
  });

  beforeEach(async () => {
    adapters = createAdapters();
    await adapters.customers.save(customer);
    moduleRef = await createTestingModule(adapters);
    await moduleRef.init(); // ejecuta PolicySequencerInitializer
    createPolicy = moduleRef.get(CreatePolicyUseCase);
    changeStatus = moduleRef.get(ChangePolicyStatusUseCase);
  });

  afterEach(() => moduleRef.close());

  describe('CreatePolicyUseCase', () => {
    it('emite la póliza en QUOTED con cobertura del ramo y prima calculada, y la persiste', async () => {
      const policy = await createPolicy.execute(
        command({
          ratingStrategy: RatingStrategyType.RISK_BASED,
          riskProfile: { riskScore: 40 },
        }),
      );

      expect(policy.status).toBe(PolicyStatus.QUOTED);
      expect(policy.monthlyPremium).toBeCloseTo(168_000); // 120.000 × 1,4
      expect(policy.coverage.coverageAmount).toBe(80_000_000);
      expect(policy.policyNumber).toBe(`POL-${YEAR}-000001`);
      await expect(adapters.policies.findById(policy.id)).resolves.toBe(policy);
    });

    it('asigna números de póliza consecutivos', async () => {
      const first = await createPolicy.execute(command());
      const second = await createPolicy.execute(
        command({ branch: Branch.LIFE }),
      );

      expect(first.policyNumber).toBe(`POL-${YEAR}-000001`);
      expect(second.policyNumber).toBe(`POL-${YEAR}-000002`);
    });

    it('al arrancar continúa la secuencia desde el máximo existente', async () => {
      const restarted = createAdapters();
      await restarted.customers.save(customer);
      await restarted.policies.save(
        new PolicyBuilder()
          .withId('existing-policy')
          .withPolicyNumber(`POL-${YEAR}-000041`)
          .withCustomerId(customer.id)
          .withBranch(Branch.HOME)
          .withRatingStrategy(RatingStrategyType.STANDARD)
          .withCoverage(new Coverage({ coverageAmount: 1, termMonths: 12 }))
          .withMonthlyPremium(75_000)
          .withRiskProfile(new RiskProfile({}))
          .build(),
      );
      const restartedModule = await createTestingModule(restarted);
      await restartedModule.init();

      const next = await restartedModule
        .get(CreatePolicyUseCase)
        .execute(command());

      expect(next.policyNumber).toBe(`POL-${YEAR}-000042`);
      await restartedModule.close();
    });

    it('rechaza un cliente inexistente sin persistir nada', async () => {
      await expect(
        createPolicy.execute(command({ customerId: 'no-existe' })),
      ).rejects.toThrow(CustomerNotFoundException);
      expect(adapters.policies.saveCount).toBe(0);
    });

    it('rechaza un cliente inactivo', async () => {
      await adapters.customers.save(customer.deactivate());

      await expect(createPolicy.execute(command())).rejects.toThrow(
        CustomerNotFoundException,
      );
    });

    it('propaga la validación de la estrategia (LOYALTY sin antigüedad) sin persistir', async () => {
      await expect(
        createPolicy.execute(
          command({
            ratingStrategy: RatingStrategyType.LOYALTY,
            riskProfile: { customerSince: YEAR },
          }),
        ),
      ).rejects.toThrow(InvalidRatingStrategyDataException);
      expect(adapters.policies.saveCount).toBe(0);
    });

    it('rechaza un ramo sin factory registrada', async () => {
      await expect(
        createPolicy.execute(command({ branch: 'MARINE' as Branch })),
      ).rejects.toThrow(UnsupportedBranchException);
    });

    it('rechaza una estrategia no registrada', async () => {
      await expect(
        createPolicy.execute(
          command({ ratingStrategy: 'PROMO' as RatingStrategyType }),
        ),
      ).rejects.toThrow(UnsupportedRatingStrategyException);
    });
  });

  describe('ChangePolicyStatusUseCase', () => {
    it('persiste la transición y publica el evento de dominio', async () => {
      const quoted = await createPolicy.execute(command());

      const issued = await changeStatus.execute(quoted.id, PolicyStatus.ISSUED);

      expect(issued.status).toBe(PolicyStatus.ISSUED);
      expect(issued.monthlyPremium).toBe(quoted.monthlyPremium);
      await expect(adapters.policies.findById(quoted.id)).resolves.toBe(issued);
      expect(adapters.events.published).toEqual([
        {
          topic: 'policy.issued',
          event: {
            policyId: quoted.id,
            policyNumber: quoted.policyNumber,
            customerId: customer.id,
            branch: Branch.AUTO,
            oldStatus: PolicyStatus.QUOTED,
            newStatus: PolicyStatus.ISSUED,
            timestamp: expect.any(String) as string,
          },
        },
      ]);
    });

    it('publica el topic correcto en cada paso del ciclo de vida', async () => {
      const { id } = await createPolicy.execute(command());

      for (const target of [
        PolicyStatus.ISSUED,
        PolicyStatus.ACTIVE,
        PolicyStatus.SUSPENDED,
        PolicyStatus.ACTIVE,
        PolicyStatus.CANCELLED,
      ]) {
        await changeStatus.execute(id, target);
      }

      expect(adapters.events.topics()).toEqual([
        'policy.issued',
        'policy.activated',
        'policy.suspended',
        'policy.reactivated',
        'policy.cancelled',
      ]);
    });

    it('una transición al mismo estado no guarda ni publica', async () => {
      const quoted = await createPolicy.execute(command());
      const savesBefore = adapters.policies.saveCount;

      const result = await changeStatus.execute(quoted.id, PolicyStatus.QUOTED);

      expect(result).toBe(quoted);
      expect(adapters.policies.saveCount).toBe(savesBefore);
      expect(adapters.events.published).toHaveLength(0);
    });

    it('una transición inválida no modifica la póliza ni publica eventos', async () => {
      const quoted = await createPolicy.execute(command());

      await expect(
        changeStatus.execute(quoted.id, PolicyStatus.ACTIVE),
      ).rejects.toThrow(InvalidStateTransitionException);

      await expect(adapters.policies.findById(quoted.id)).resolves.toBe(quoted);
      expect(adapters.events.published).toHaveLength(0);
    });

    it('rechaza una póliza inexistente', async () => {
      await expect(
        changeStatus.execute('no-existe', PolicyStatus.ISSUED),
      ).rejects.toThrow(PolicyNotFoundException);
    });
  });

  describe('Consultas', () => {
    it('GetPolicyUseCase devuelve la póliza o lanza 404', async () => {
      const policy = await createPolicy.execute(command());
      const getPolicy = moduleRef.get(GetPolicyUseCase);

      await expect(getPolicy.execute(policy.id)).resolves.toBe(policy);
      await expect(getPolicy.execute('no-existe')).rejects.toThrow(
        PolicyNotFoundException,
      );
    });

    it('GetPoliciesByCustomerUseCase filtra por cliente', async () => {
      const other = activeCustomer({
        id: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
        email: 'otro@example.com',
      });
      await adapters.customers.save(other);
      await createPolicy.execute(command());
      await createPolicy.execute(command({ customerId: other.id }));

      const policies = await moduleRef
        .get(GetPoliciesByCustomerUseCase)
        .execute(other.id);

      expect(policies.map((p) => p.customerId)).toEqual([other.id]);
    });

    it('GetAllPoliciesUseCase lista todas las pólizas', async () => {
      await createPolicy.execute(command());
      await createPolicy.execute(command({ branch: Branch.TRAVEL }));

      await expect(
        moduleRef.get(GetAllPoliciesUseCase).execute(),
      ).resolves.toHaveLength(2);
    });
  });
});
