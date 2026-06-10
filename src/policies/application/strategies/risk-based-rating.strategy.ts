import { Injectable } from '@nestjs/common';
import { RatingStrategyType } from '../../domain/enums/rating-strategy-type.enum';
import { InvalidRatingStrategyDataException } from '../../domain/exceptions/invalid-rating-strategy-data.exception';
import { RatingStrategyPort } from '../../domain/ports/rating-strategy.port';
import { RiskProfile } from '../../domain/value-objects/risk-profile.vo';
import { InsuranceConfigRegistry } from '../../../config/insurance-config.registry';

@Injectable()
export class RiskBasedRatingStrategy implements RatingStrategyPort {
  constructor(private readonly config: InsuranceConfigRegistry) {}

  getName(): RatingStrategyType {
    return RatingStrategyType.RISK_BASED;
  }

  validate(riskProfile: RiskProfile): void {
    if (riskProfile.riskScore === undefined || riskProfile.riskScore === null) {
      throw new InvalidRatingStrategyDataException(
        'riskProfile.riskScore is required for RISK_BASED strategy',
      );
    }
    const { riskScoreMin, riskScoreMax } = this.config;
    if (riskProfile.riskScore < riskScoreMin || riskProfile.riskScore > riskScoreMax) {
      throw new InvalidRatingStrategyDataException(
        `riskProfile.riskScore must be between ${riskScoreMin} and ${riskScoreMax}`,
      );
    }
  }

  calculatePremium(basePremium: number, riskProfile: RiskProfile): number {
    return basePremium * (1 + riskProfile.riskScore! / 100);
  }
}
