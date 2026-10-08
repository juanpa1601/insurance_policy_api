import { Injectable } from '@nestjs/common';
import { PolicyStatus } from '../enums/policy-status.enum';
import { InvalidStateTransitionException } from '../exceptions/invalid-state-transition.exception';
import { PolicyStatePort } from './policy-state.port';

@Injectable()
export class IssuedState implements PolicyStatePort {
  private static readonly ALLOWED_TRANSITIONS = [
    PolicyStatus.ACTIVE,
    PolicyStatus.CANCELLED,
  ];

  getStatus(): PolicyStatus {
    return PolicyStatus.ISSUED;
  }

  transitionTo(target: PolicyStatus): PolicyStatus {
    if (target === this.getStatus()) return this.getStatus();

    if (!IssuedState.ALLOWED_TRANSITIONS.includes(target)) {
      throw new InvalidStateTransitionException(this.getStatus(), target);
    }
    return target;
  }
}
