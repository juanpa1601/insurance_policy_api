import { Branch } from './enums/branch.enum';
import { PolicyStatus } from './enums/policy-status.enum';
import { RatingStrategyType } from './enums/rating-strategy-type.enum';
import { Coverage } from './value-objects/coverage.vo';
import { RiskProfile } from './value-objects/risk-profile.vo';

interface PolicyProps {
  id: string;
  policyNumber: string;
  customerId: string;
  branch: Branch;
  ratingStrategy: RatingStrategyType;
  status: PolicyStatus;
  coverage: Coverage;
  monthlyPremium: number;
  riskProfile: RiskProfile;
  createdAt: Date;
  updatedAt: Date;
}

export class Policy {
  readonly id: string;
  readonly policyNumber: string;
  readonly customerId: string;
  readonly branch: Branch;
  readonly ratingStrategy: RatingStrategyType;
  readonly status: PolicyStatus;
  readonly coverage: Coverage;         // inmutable tras la creación
  readonly monthlyPremium: number;     // inmutable tras la creación
  readonly riskProfile: RiskProfile;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: PolicyProps) {
    this.id = props.id;
    this.policyNumber = props.policyNumber;
    this.customerId = props.customerId;
    this.branch = props.branch;
    this.ratingStrategy = props.ratingStrategy;
    this.status = props.status;
    this.coverage = props.coverage;
    this.monthlyPremium = props.monthlyPremium;
    this.riskProfile = props.riskProfile;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  // Retorna una nueva instancia con el estado actualizado.
  // La cobertura y la prima permanecen inmutables.
  withStatus(newStatus: PolicyStatus): Policy {
    return new Policy({ ...this, status: newStatus, updatedAt: new Date() });
  }
}
