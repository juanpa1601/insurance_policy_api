import { InsuranceConfigRegistry } from '../../../config/insurance-config.registry';
import { Branch } from '../../domain/enums/branch.enum';
import { PolicyFactoryPort } from '../../domain/ports/policy-factory.port';
import { CoverageProps } from '../../domain/value-objects/coverage.vo';
import { AutoPolicyFactory } from './auto-policy.factory';
import { HealthPolicyFactory } from './health-policy.factory';
import { HomePolicyFactory } from './home-policy.factory';
import { LifePolicyFactory } from './life-policy.factory';
import { TravelPolicyFactory } from './travel-policy.factory';

const config = new InsuranceConfigRegistry();

const cases: [Branch, PolicyFactoryPort, number, CoverageProps][] = [
  [
    Branch.AUTO,
    new AutoPolicyFactory(config),
    120_000,
    { coverageAmount: 80_000_000, deductible: 1_000_000, termMonths: 12 },
  ],
  [
    Branch.LIFE,
    new LifePolicyFactory(config),
    90_000,
    { coverageAmount: 200_000_000, beneficiaryRequired: true, termMonths: 12 },
  ],
  [
    Branch.HOME,
    new HomePolicyFactory(config),
    75_000,
    { coverageAmount: 150_000_000, deductible: 2_000_000, termMonths: 12 },
  ],
  [
    Branch.HEALTH,
    new HealthPolicyFactory(config),
    180_000,
    {
      coverageAmount: 100_000_000,
      copayRate: 0.2,
      waitingPeriodDays: 30,
      termMonths: 12,
    },
  ],
  [
    Branch.TRAVEL,
    new TravelPolicyFactory(config),
    65_000,
    { coverageAmount: 120_000_000, deductible: 300_000, termMonths: 3 },
  ],
];

describe('Policy factories (Factory Method)', () => {
  describe.each(cases)('%s', (branch, factory, basePremium, coverage) => {
    it('declara su ramo', () => {
      expect(factory.getBranch()).toBe(branch);
    });

    it(`usa la prima base del registro de configuración (${basePremium})`, () => {
      expect(factory.getBasePremium()).toBe(basePremium);
      expect(factory.getBasePremium()).toBe(config.getBasePremium(branch));
    });

    it('crea la cobertura por defecto del ramo', () => {
      expect(factory.createDefaultCoverage().toPlainObject()).toEqual(coverage);
    });

    it('crea una cobertura nueva en cada llamada', () => {
      expect(factory.createDefaultCoverage()).not.toBe(
        factory.createDefaultCoverage(),
      );
    });
  });

  it('hay exactamente una factory por cada ramo', () => {
    const branches = cases.map(([, factory]) => factory.getBranch());
    expect(new Set(branches)).toEqual(new Set(Object.values(Branch)));
  });
});
