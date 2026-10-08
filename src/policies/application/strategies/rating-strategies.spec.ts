import { InsuranceConfigRegistry } from '../../../config/insurance-config.registry';
import { RatingStrategyType } from '../../domain/enums/rating-strategy-type.enum';
import { InvalidRatingStrategyDataException } from '../../domain/exceptions/invalid-rating-strategy-data.exception';
import { RiskProfile } from '../../domain/value-objects/risk-profile.vo';
import { LoyaltyRatingStrategy } from './loyalty-rating.strategy';
import { RiskBasedRatingStrategy } from './risk-based-rating.strategy';
import { StandardRatingStrategy } from './standard-rating.strategy';

const BASE_PREMIUM = 100_000;

describe('Rating strategies (Strategy)', () => {
  const config = new InsuranceConfigRegistry();

  describe('StandardRatingStrategy', () => {
    const strategy = new StandardRatingStrategy();

    it('se identifica como STANDARD', () => {
      expect(strategy.getName()).toBe(RatingStrategyType.STANDARD);
    });

    it('acepta un perfil de riesgo vacío', () => {
      expect(() => strategy.validate(new RiskProfile({}))).not.toThrow();
    });

    it('cobra exactamente la prima base', () => {
      expect(strategy.calculatePremium(BASE_PREMIUM, new RiskProfile({}))).toBe(
        BASE_PREMIUM,
      );
    });
  });

  describe('RiskBasedRatingStrategy', () => {
    const strategy = new RiskBasedRatingStrategy(config);

    it('se identifica como RISK_BASED', () => {
      expect(strategy.getName()).toBe(RatingStrategyType.RISK_BASED);
    });

    it('exige riskScore', () => {
      expect(() => strategy.validate(new RiskProfile({}))).toThrow(
        InvalidRatingStrategyDataException,
      );
    });

    it.each([0, 50, 100])(
      'acepta riskScore=%i (límites incluidos)',
      (score) => {
        expect(() =>
          strategy.validate(new RiskProfile({ riskScore: score })),
        ).not.toThrow();
      },
    );

    it.each([-1, 101])('rechaza riskScore=%i fuera de [0, 100]', (score) => {
      expect(() =>
        strategy.validate(new RiskProfile({ riskScore: score })),
      ).toThrow('riskProfile.riskScore must be between 0 and 100');
    });

    it.each([
      [0, 100_000],
      [40, 140_000],
      [100, 200_000],
    ])('con riskScore=%i la prima es %i', (score, expected) => {
      expect(
        strategy.calculatePremium(
          BASE_PREMIUM,
          new RiskProfile({ riskScore: score }),
        ),
      ).toBeCloseTo(expected);
    });
  });

  describe('LoyaltyRatingStrategy', () => {
    const strategy = new LoyaltyRatingStrategy(config);

    beforeAll(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-15T12:00:00Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('se identifica como LOYALTY', () => {
      expect(strategy.getName()).toBe(RatingStrategyType.LOYALTY);
    });

    it('exige customerSince', () => {
      expect(() => strategy.validate(new RiskProfile({}))).toThrow(
        'riskProfile.customerSince (year) is required for LOYALTY strategy',
      );
    });

    it('acepta exactamente 2 años de antigüedad (límite)', () => {
      expect(() =>
        strategy.validate(new RiskProfile({ customerSince: 2024 })),
      ).not.toThrow();
    });

    it('rechaza 1 año de antigüedad', () => {
      expect(() =>
        strategy.validate(new RiskProfile({ customerSince: 2025 })),
      ).toThrow('at least 2 years as a customer for LOYALTY strategy (has 1)');
    });

    it('rechaza un año de ingreso en el futuro', () => {
      expect(() =>
        strategy.validate(new RiskProfile({ customerSince: 2030 })),
      ).toThrow(InvalidRatingStrategyDataException);
    });

    it('aplica 15 % de descuento sobre la prima base', () => {
      expect(
        strategy.calculatePremium(
          BASE_PREMIUM,
          new RiskProfile({ customerSince: 2020 }),
        ),
      ).toBeCloseTo(85_000);
    });
  });
});
