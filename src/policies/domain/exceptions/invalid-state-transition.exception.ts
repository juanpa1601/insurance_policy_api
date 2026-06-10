import { DomainException } from '../../../shared/domain/domain.exception';
import { PolicyStatus } from '../enums/policy-status.enum';

export class InvalidStateTransitionException extends DomainException {
  constructor(from: PolicyStatus, to: PolicyStatus) {
    super(`Transition from '${from}' to '${to}' is not allowed`, 400);
  }
}
