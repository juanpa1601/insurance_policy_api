import { PolicyStatus } from '../../../policies/domain/enums/policy-status.enum';
import { Branch } from '../../../policies/domain/enums/branch.enum';

export interface PolicyDomainEvent {
  policyId: string;
  policyNumber: string;
  customerId: string;
  branch: Branch;
  oldStatus: PolicyStatus;
  newStatus: PolicyStatus;
  timestamp: string; // ISO-8601
}

export const PolicyTopics = {
  ISSUED: 'policy.issued',
  ACTIVATED: 'policy.activated',
  SUSPENDED: 'policy.suspended',
  REACTIVATED: 'policy.reactivated',
  CANCELLED: 'policy.cancelled',
} as const;
