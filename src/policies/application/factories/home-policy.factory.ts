import { Injectable } from '@nestjs/common';
import { Branch } from '../../domain/enums/branch.enum';
import { PolicyFactoryPort } from '../../domain/ports/policy-factory.port';
import { Coverage } from '../../domain/value-objects/coverage.vo';
import { InsuranceConfigRegistry } from '../../../config/insurance-config.registry';

@Injectable()
export class HomePolicyFactory implements PolicyFactoryPort {
  constructor(private readonly config: InsuranceConfigRegistry) {}

  getBranch(): Branch {
    return Branch.HOME;
  }

  createDefaultCoverage(): Coverage {
    return new Coverage({
      coverageAmount: 150_000_000,
      deductible: 2_000_000,
      termMonths: 12,
    });
  }

  getBasePremium(): number {
    return this.config.getBasePremium(Branch.HOME);
  }
}
