import { RatingStrategyType } from '../enums/rating-strategy-type.enum';
import { RiskProfile } from '../value-objects/risk-profile.vo';

// Contrato del patron Strategy.
// Cada algoritmo de tarificacion implementa este port.
export interface RatingStrategyPort {
  getName(): RatingStrategyType;
  validate(riskProfile: RiskProfile): void;
  calculatePremium(basePremium: number, riskProfile: RiskProfile): number;
}
