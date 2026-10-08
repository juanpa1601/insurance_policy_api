import { Customer } from '../../../customers/domain/customer.entity';
import { CustomerMapper } from '../../../customers/infrastructure/persistence/customer.mapper';
import { PolicyBuilder } from '../../application/builders/policy.builder';
import { Branch } from '../../domain/enums/branch.enum';
import { PolicyStatus } from '../../domain/enums/policy-status.enum';
import { RatingStrategyType } from '../../domain/enums/rating-strategy-type.enum';
import { Coverage } from '../../domain/value-objects/coverage.vo';
import { RiskProfile } from '../../domain/value-objects/risk-profile.vo';
import { PolicyMapper } from './policy.mapper';

describe('Mappers de persistencia (dominio ⇄ ORM)', () => {
  it('PolicyMapper conserva la póliza en el ida y vuelta, incluidos los value objects', () => {
    const policy = new PolicyBuilder()
      .withId('policy-1')
      .withPolicyNumber('POL-2026-000001')
      .withCustomerId('customer-1')
      .withBranch(Branch.HEALTH)
      .withRatingStrategy(RatingStrategyType.RISK_BASED)
      .withCoverage(
        new Coverage({
          coverageAmount: 100_000_000,
          copayRate: 0.2,
          waitingPeriodDays: 30,
          termMonths: 12,
        }),
      )
      .withMonthlyPremium(198_000)
      .withRiskProfile(new RiskProfile({ riskScore: 10 }))
      .build()
      .withStatus(PolicyStatus.ACTIVE);

    const orm = PolicyMapper.toOrm(policy);
    const restored = PolicyMapper.toDomain(orm);

    expect(orm.coverage).toEqual({
      coverageAmount: 100_000_000,
      copayRate: 0.2,
      waitingPeriodDays: 30,
      termMonths: 12,
    });
    expect(orm.riskProfile).toEqual({ riskScore: 10 });
    expect(restored).toEqual(policy);
    expect(restored.coverage).toBeInstanceOf(Coverage);
    expect(restored.riskProfile).toBeInstanceOf(RiskProfile);
  });

  it('PolicyMapper convierte a número la prima que PostgreSQL devuelve como texto (decimal)', () => {
    const orm = PolicyMapper.toOrm(
      new PolicyBuilder()
        .withId('policy-1')
        .withPolicyNumber('POL-2026-000001')
        .withCustomerId('customer-1')
        .withBranch(Branch.AUTO)
        .withRatingStrategy(RatingStrategyType.STANDARD)
        .withCoverage(new Coverage({ coverageAmount: 1, termMonths: 12 }))
        .withMonthlyPremium(120_000)
        .withRiskProfile(new RiskProfile({}))
        .build(),
    );
    (orm as unknown as { monthlyPremium: string }).monthlyPremium = '120000.00';

    expect(PolicyMapper.toDomain(orm).monthlyPremium).toBe(120_000);
  });

  it('RiskProfile omite los campos ausentes al serializar', () => {
    expect(new RiskProfile({}).toPlainObject()).toEqual({});
    expect(new RiskProfile({ customerSince: 2020 }).toPlainObject()).toEqual({
      customerSince: 2020,
    });
  });

  it('CustomerMapper conserva el cliente en el ida y vuelta', () => {
    const customer = new Customer({
      id: 'customer-1',
      name: 'Ana Torres',
      email: 'ana@example.com',
      isActive: false,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-02-01T00:00:00Z'),
    });

    expect(CustomerMapper.toDomain(CustomerMapper.toOrm(customer))).toEqual(
      customer,
    );
  });
});
