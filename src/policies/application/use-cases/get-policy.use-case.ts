import { Inject, Injectable } from '@nestjs/common';
import { Policy } from '../../domain/policy.entity';
import type { PolicyRepositoryPort } from '../../domain/ports/policy.repository.port';
import { PolicyNotFoundException } from '../../domain/exceptions/policy-not-found.exception';

@Injectable()
export class GetPolicyUseCase {
  constructor(
    @Inject('PolicyRepositoryPort')
    private readonly policyRepository: PolicyRepositoryPort,
  ) {}

  async execute(id: string): Promise<Policy> {
    const policy = await this.policyRepository.findById(id);
    if (!policy) throw new PolicyNotFoundException(id);
    return policy;
  }
}
