import { 
  Inject, 
  Injectable 
} from '@nestjs/common';
import { Policy } from '../../domain/policy.entity';
import type { PolicyRepositoryPort } from '../../domain/ports/policy.repository.port';

@Injectable()
export class GetPoliciesByCustomerUseCase {
  constructor(
    @Inject('PolicyRepositoryPort')
    private readonly policyRepository: PolicyRepositoryPort,
  ) {}

  async execute(customerId: string): Promise<Policy[]> {
    // 1) Se delega directamente al repositorio la búsqueda de todas las pólizas
    //    asociadas al customerId. Retorna un array vacío si el cliente no tiene pólizas.
    return this.policyRepository.findByCustomerId(customerId);
  }
}
