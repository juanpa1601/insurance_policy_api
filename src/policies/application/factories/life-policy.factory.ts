import { Injectable } from '@nestjs/common';
import { Branch } from '../../domain/enums/branch.enum';
import { PolicyFactoryPort } from '../../domain/ports/policy-factory.port';
import { Coverage } from '../../domain/value-objects/coverage.vo';
import { InsuranceConfigRegistry } from '../../../config/insurance-config.registry';

@Injectable()
export class LifePolicyFactory implements PolicyFactoryPort {
  constructor(private readonly config: InsuranceConfigRegistry) {}

  getBranch(): Branch {
    return Branch.LIFE;
  }

  createDefaultCoverage(): Coverage {
    return new Coverage({
      coverageAmount: 200_000_000,
      beneficiaryRequired: true,
      termMonths: 12,
    });
  }

  getBasePremium(): number {
    return this.config.getBasePremium(Branch.LIFE);
  }
}
