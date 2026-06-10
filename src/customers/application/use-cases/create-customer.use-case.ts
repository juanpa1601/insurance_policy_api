import { 
  Inject, 
  Injectable 
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Customer } from '../../domain/customer.entity';
import type { CustomerRepositoryPort } from '../../domain/ports/customer.repository.port';
import { EmailAlreadyExistsException } from '../../domain/exceptions/email-already-exists.exception';

export interface CreateCustomerCommand {
  name: string;
  email: string;
}

@Injectable()
export class CreateCustomerUseCase {
  constructor(
    @Inject('CustomerRepositoryPort')
    private readonly customerRepository: CustomerRepositoryPort,
  ) {}

  async execute(command: CreateCustomerCommand): Promise<Customer> {
    const existing: Customer | null = await this.customerRepository.findByEmail(command.email);
    if (existing) {
      throw new EmailAlreadyExistsException(command.email);
    }

    const now: Date = new Date();
    const customer: Customer = new Customer({
      id: uuidv4(),
      name: command.name,
      email: command.email,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return this.customerRepository.save(customer);
  }
}
