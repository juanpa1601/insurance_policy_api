import { Policy } from '../policy.entity';

export interface PolicyRepositoryPort {
  save(policy: Policy): Promise<Policy>;
  findById(id: string): Promise<Policy | null>;
  findByCustomerId(customerId: string): Promise<Policy[]>;
}
