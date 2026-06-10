import { Injectable } from '@nestjs/common';
import { Branch } from '../../domain/enums/branch.enum';
import { PolicyFactoryPort } from '../../domain/ports/policy-factory.port';
import { Coverage } from '../../domain/value-objects/coverage.vo';
import { InsuranceConfigRegistry } from '../../../config/insurance-config.registry';

@Injectable()
export class HealthPolicyFactory implements PolicyFactoryPort {
  constructor(private readonly config: InsuranceConfigRegistry) {}

  getBranch(): Branch {
    return Branch.HEALTH;
  }

  createDefaultCoverage(): Coverage {
    return new Coverage({
      coverageAmount: 100_000_000,
      copayRate: 0.20,
      waitingPeriodDays: 30,
      termMonths: 12,
    });
  }

  getBasePremium(): number {
    return this.config.getBasePremium(Branch.HEALTH);
  }
}
