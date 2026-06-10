import { DomainException } from '../../../shared/domain/domain.exception';

export class InvalidRatingStrategyDataException extends DomainException {
  constructor(message: string) {
    super(message, 400);
  }
}
