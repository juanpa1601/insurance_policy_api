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
    // 1) Se verifica que no exista otro cliente con el mismo email en BD.
    //    Si ya existe, se lanza EmailAlreadyExistsException (HTTP 409).
    const existing: Customer | null = await this.customerRepository.findByEmail(command.email);
    if (existing) {
      throw new EmailAlreadyExistsException(command.email);
    }

    // 2) Se construye la entidad de dominio Customer con un UUID generado,
    //    isActive en true por defecto y timestamps del momento de creación.
    const now: Date = new Date();
    const customer: Customer = new Customer({
      id: uuidv4(),
      name: command.name,
      email: command.email,
      isActive: true,
      createdAt: now,
      updatedAt: now
    });

    // 3) Se persiste el cliente en BD y se retorna la entidad guardada.
    return this.customerRepository.save(customer);
  }
}
