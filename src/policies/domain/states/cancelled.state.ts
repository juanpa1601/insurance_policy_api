import { Injectable } from '@nestjs/common';
import { PolicyStatus } from '../enums/policy-status.enum';
import { InvalidStateTransitionException } from '../exceptions/invalid-state-transition.exception';
import { PolicyStatePort } from './policy-state.port';

// Estado terminal: ninguna transicion esta permitida desde aqui.
@Injectable()
export class CancelledState implements PolicyStatePort {
  getStatus(): PolicyStatus {
    return PolicyStatus.CANCELLED;
  }

  transitionTo(target: PolicyStatus): PolicyStatus {
    throw new InvalidStateTransitionException(this.getStatus(), target);
  }
}
