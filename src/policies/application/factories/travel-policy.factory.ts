import { Injectable } from '@nestjs/common';
import { Branch } from '../../domain/enums/branch.enum';
import { PolicyFactoryPort } from '../../domain/ports/policy-factory.port';
import { Coverage } from '../../domain/value-objects/coverage.vo';
import { InsuranceConfigRegistry } from '../../../config/insurance-config.registry';

@Injectable()
export class TravelPolicyFactory implements PolicyFactoryPort {
  constructor(private readonly config: InsuranceConfigRegistry) {}

  getBranch(): Branch {
    return Branch.TRAVEL;
  }

  createDefaultCoverage(): Coverage {
    return new Coverage({
      coverageAmount: 120_000_000,
      deductible: 300_000,
      termMonths: 3,
    });
  }

  getBasePremium(): number {
    return this.config.getBasePremium(Branch.TRAVEL);
  }
}
