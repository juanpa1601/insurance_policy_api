import {
  Inject,
  Injectable
} from '@nestjs/common';
import { Customer } from '../../domain/customer.entity';
import type { CustomerRepositoryPort } from '../../domain/ports/customer.repository.port';

@Injectable()
export class GetAllCustomersUseCase {
  constructor(
    @Inject('CustomerRepositoryPort')
    private readonly customerRepository: CustomerRepositoryPort,
  ) {}

  execute(): Promise<Customer[]> {
    return this.customerRepository.findAll();
  }
}
