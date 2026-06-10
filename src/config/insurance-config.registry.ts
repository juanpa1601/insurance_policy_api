import { Injectable } from '@nestjs/common';
import { Branch } from '../policies/domain/enums/branch.enum';

// Singleton gestionado por el contenedor de DI de NestJS (scope DEFAULT = singleton).
// Centraliza las constantes de tarificacion para que no haya numeros magicos dispersos.
@Injectable()
export class InsuranceConfigRegistry {
  private readonly basePremiums: Readonly<Record<Branch, number>> = {
    [Branch.AUTO]: 120_000,
    [Branch.LIFE]: 90_000,
    [Branch.HOME]: 75_000,
    [Branch.HEALTH]: 180_000,
    [Branch.TRAVEL]: 65_000,
  };

  readonly loyaltyDiscountFactor: number = 0.85;
  readonly loyaltyMinYears: number = 2;
  readonly riskScoreMin: number = 0;
  readonly riskScoreMax: number = 100;

  getBasePremium(branch: Branch): number {
    return this.basePremiums[branch];
  }
}
