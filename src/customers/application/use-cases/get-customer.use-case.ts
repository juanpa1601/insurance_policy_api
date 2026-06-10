import { 
  Inject, 
  Injectable 
} from '@nestjs/common';
import { Customer } from '../../domain/customer.entity';
import type { CustomerRepositoryPort } from '../../domain/ports/customer.repository.port';
import { CustomerNotFoundException } from '../../domain/exceptions/customer-not-found.exception';

@Injectable()
export class GetCustomerUseCase {
  constructor(
    @Inject('CustomerRepositoryPort')
    private readonly customerRepository: CustomerRepositoryPort,
  ) {}

  async execute(id: string): Promise<Customer> {
    const customer: Customer | null = await this.customerRepository.findById(id);
    if (!customer) {
      throw new CustomerNotFoundException(id);
    }
    return customer;
  }
}
