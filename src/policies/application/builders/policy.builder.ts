import { Policy } from '../../domain/policy.entity';
import { Branch } from '../../domain/enums/branch.enum';
import { PolicyStatus } from '../../domain/enums/policy-status.enum';
import { RatingStrategyType } from '../../domain/enums/rating-strategy-type.enum';
import { Coverage } from '../../domain/value-objects/coverage.vo';
import { RiskProfile } from '../../domain/value-objects/risk-profile.vo';

export class PolicyBuilder {
  private _id?: string;
  private _policyNumber?: string;
  private _customerId?: string;
  private _branch?: Branch;
  private _ratingStrategy?: RatingStrategyType;
  private _coverage?: Coverage;
  private _monthlyPremium?: number;
  private _riskProfile?: RiskProfile;

  withId(id: string): this {
    this._id = id;
    return this;
  }

  withPolicyNumber(policyNumber: string): this {
    this._policyNumber = policyNumber;
    return this;
  }

  withCustomerId(customerId: string): this {
    this._customerId = customerId;
    return this;
  }

  withBranch(branch: Branch): this {
    this._branch = branch;
    return this;
  }

  withRatingStrategy(strategy: RatingStrategyType): this {
    this._ratingStrategy = strategy;
    return this;
  }

  withCoverage(coverage: Coverage): this {
    this._coverage = coverage;
    return this;
  }

  withMonthlyPremium(premium: number): this {
    this._monthlyPremium = premium;
    return this;
  }

  withRiskProfile(riskProfile: RiskProfile): this {
    this._riskProfile = riskProfile;
    return this;
  }

  build(): Policy {
    this.assertPresent(this._id, 'id');
    this.assertPresent(this._policyNumber, 'policyNumber');
    this.assertPresent(this._customerId, 'customerId');
    this.assertPresent(this._branch, 'branch');
    this.assertPresent(this._ratingStrategy, 'ratingStrategy');
    this.assertPresent(this._coverage, 'coverage');
    this.assertPresent(this._monthlyPremium, 'monthlyPremium');
    this.assertPresent(this._riskProfile, 'riskProfile');

    const now: Date = new Date();
    return new Policy({
      id: this._id!,
      policyNumber: this._policyNumber!,
      customerId: this._customerId!,
      branch: this._branch!,
      ratingStrategy: this._ratingStrategy!,
      status: PolicyStatus.QUOTED,   // toda poliza nueva comienza en QUOTED
      coverage: this._coverage!,
      monthlyPremium: this._monthlyPremium!,
      riskProfile: this._riskProfile!,
      createdAt: now,
      updatedAt: now,
    });
  }

  private assertPresent(
    value: unknown, 
    field: string
  ): void {
    if (value === undefined || value === null) {
      throw new Error(`PolicyBuilder: field '${field}' is required`);
    }
  }
}
