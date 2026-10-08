import { Branch } from '../../domain/enums/branch.enum';
import { PolicyStatus } from '../../domain/enums/policy-status.enum';
import { RatingStrategyType } from '../../domain/enums/rating-strategy-type.enum';
import { Coverage } from '../../domain/value-objects/coverage.vo';
import { RiskProfile } from '../../domain/value-objects/risk-profile.vo';
import { PolicyBuilder } from './policy.builder';

const completeBuilder = (): PolicyBuilder =>
  new PolicyBuilder()
    .withId('policy-1')
    .withPolicyNumber('POL-2026-000001')
    .withCustomerId('customer-1')
    .withBranch(Branch.AUTO)
    .withRatingStrategy(RatingStrategyType.STANDARD)
    .withCoverage(new Coverage({ coverageAmount: 1_000, termMonths: 12 }))
    .withMonthlyPremium(120_000)
    .withRiskProfile(new RiskProfile({}));

describe('PolicyBuilder (Builder)', () => {
  it('construye la póliza con todos los campos y estado inicial QUOTED', () => {
    const policy = completeBuilder().build();

    expect(policy).toMatchObject({
      id: 'policy-1',
      policyNumber: 'POL-2026-000001',
      customerId: 'customer-1',
      branch: Branch.AUTO,
      ratingStrategy: RatingStrategyType.STANDARD,
      monthlyPremium: 120_000,
      status: PolicyStatus.QUOTED,
    });
    expect(policy.createdAt).toEqual(policy.updatedAt);
  });

  it('permite una prima de 0 (solo rechaza undefined o null)', () => {
    expect(completeBuilder().withMonthlyPremium(0).build().monthlyPremium).toBe(
      0,
    );
  });

  it.each([
    'id',
    'policyNumber',
    'customerId',
    'branch',
    'ratingStrategy',
    'coverage',
    'monthlyPremium',
    'riskProfile',
  ])('falla si falta %s', (field) => {
    const builder = completeBuilder();
    // Simula que el campo nunca se asignó.
    (builder as unknown as Record<string, unknown>)[`_${field}`] = undefined;

    expect(() => builder.build()).toThrow(
      `PolicyBuilder: field '${field}' is required`,
    );
  });

  it('la póliza es inmutable: withStatus devuelve otra instancia sin tocar prima ni cobertura', () => {
    const quoted = completeBuilder().build();
    const issued = quoted.withStatus(PolicyStatus.ISSUED);

    expect(issued).not.toBe(quoted);
    expect(quoted.status).toBe(PolicyStatus.QUOTED);
    expect(issued.status).toBe(PolicyStatus.ISSUED);
    expect(issued.monthlyPremium).toBe(quoted.monthlyPremium);
    expect(issued.coverage).toBe(quoted.coverage);
  });
});
