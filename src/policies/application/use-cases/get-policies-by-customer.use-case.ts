import { Inject, Injectable } from '@nestjs/common';
import { Policy } from '../../domain/policy.entity';
import type { PolicyRepositoryPort } from '../../domain/ports/policy.repository.port';

@Injectable()
export class GetPoliciesByCustomerUseCase {
  constructor(
    @Inject('PolicyRepositoryPort')
    private readonly policyRepository: PolicyRepositoryPort,
  ) {}

  async execute(customerId: string): Promise<Policy[]> {
    return this.policyRepository.findByCustomerId(customerId);
  }
}
