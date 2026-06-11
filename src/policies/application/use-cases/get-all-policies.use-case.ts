import {
  Inject,
  Injectable
} from '@nestjs/common';
import { Policy } from '../../domain/policy.entity';
import type { PolicyRepositoryPort } from '../../domain/ports/policy.repository.port';

@Injectable()
export class GetAllPoliciesUseCase {
  constructor(
    @Inject('PolicyRepositoryPort')
    private readonly policyRepository: PolicyRepositoryPort,
  ) {}

  execute(): Promise<Policy[]> {
    return this.policyRepository.findAll();
  }
}
