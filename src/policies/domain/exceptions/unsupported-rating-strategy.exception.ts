import { DomainException } from '../../../shared/domain/domain.exception';

export class UnsupportedRatingStrategyException extends DomainException {
  constructor(strategy: string) {
    super(`Rating strategy '${strategy}' is not supported`, 400);
  }
}
