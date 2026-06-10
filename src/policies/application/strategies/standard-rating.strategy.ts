import { Injectable } from '@nestjs/common';
import { RatingStrategyType } from '../../domain/enums/rating-strategy-type.enum';
import { RatingStrategyPort } from '../../domain/ports/rating-strategy.port';
import { RiskProfile } from '../../domain/value-objects/risk-profile.vo';

@Injectable()
export class StandardRatingStrategy implements RatingStrategyPort {
  getName(): RatingStrategyType {
    return RatingStrategyType.STANDARD;
  }

  validate(_riskProfile: RiskProfile): void {
    // Sin validaciones adicionales: cualquier perfil es valido para STANDARD
  }

  calculatePremium(
    basePremium: number, 
    _riskProfile: RiskProfile
  ): number {
    return basePremium;
  }
}
