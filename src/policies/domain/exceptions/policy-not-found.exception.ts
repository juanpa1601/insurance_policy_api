import { DomainException } from '../../../shared/domain/domain.exception';

export class PolicyNotFoundException extends DomainException {
  constructor(id: string) {
    super(`Policy with id '${id}' was not found`, 404);
  }
}
