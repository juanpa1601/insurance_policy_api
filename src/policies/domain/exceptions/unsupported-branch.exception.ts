import { DomainException } from '../../../shared/domain/domain.exception';

export class UnsupportedBranchException extends DomainException {
  constructor(branch: string) {
    super(`Branch '${branch}' is not supported`, 400);
  }
}
