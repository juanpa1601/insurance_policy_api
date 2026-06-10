import { Injectable } from '@nestjs/common';
import { RatingStrategyType } from '../../domain/enums/rating-strategy-type.enum';
import { InvalidRatingStrategyDataException } from '../../domain/exceptions/invalid-rating-strategy-data.exception';
import { RatingStrategyPort } from '../../domain/ports/rating-strategy.port';
import { RiskProfile } from '../../domain/value-objects/risk-profile.vo';
import { InsuranceConfigRegistry } from '../../../config/insurance-config.registry';

@Injectable()
export class LoyaltyRatingStrategy implements RatingStrategyPort {
  constructor(private readonly config: InsuranceConfigRegistry) {}

  getName(): RatingStrategyType {
    return RatingStrategyType.LOYALTY;
  }

  validate(riskProfile: RiskProfile): void {
    if (!riskProfile.customerSince) {
      throw new InvalidRatingStrategyDataException(
        'riskProfile.customerSince (year) is required for LOYALTY strategy',
      );
    }
    const currentYear: number = new Date().getFullYear();
    const yearsAsCustomer: number = currentYear - riskProfile.customerSince;

    if (yearsAsCustomer < this.config.loyaltyMinYears) {
      throw new InvalidRatingStrategyDataException(
        `Customer must have at least ${this.config.loyaltyMinYears} years as a customer for LOYALTY strategy (has ${yearsAsCustomer})`,
      );
    }
  }

  calculatePremium(
    basePremium: number, 
    _riskProfile: RiskProfile
  ): number {
    return basePremium * this.config.loyaltyDiscountFactor;
  }
}
