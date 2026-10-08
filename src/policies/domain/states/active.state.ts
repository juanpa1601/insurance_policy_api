import { Injectable } from '@nestjs/common';
import { PolicyStatus } from '../enums/policy-status.enum';
import { InvalidStateTransitionException } from '../exceptions/invalid-state-transition.exception';
import { PolicyStatePort } from './policy-state.port';

@Injectable()
export class ActiveState implements PolicyStatePort {
  private static readonly ALLOWED_TRANSITIONS = [
    PolicyStatus.SUSPENDED,
    PolicyStatus.CANCELLED,
  ];

  getStatus(): PolicyStatus {
    return PolicyStatus.ACTIVE;
  }

  transitionTo(target: PolicyStatus): PolicyStatus {
    if (target === this.getStatus()) return this.getStatus();

    if (!ActiveState.ALLOWED_TRANSITIONS.includes(target)) {
      throw new InvalidStateTransitionException(this.getStatus(), target);
    }
    return target;
  }
}
