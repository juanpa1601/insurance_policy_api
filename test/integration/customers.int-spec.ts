import { TestingModule } from '@nestjs/testing';
import { CreateCustomerUseCase } from '../../src/customers/application/use-cases/create-customer.use-case';
import { GetAllCustomersUseCase } from '../../src/customers/application/use-cases/get-all-customers.use-case';
import { GetCustomerUseCase } from '../../src/customers/application/use-cases/get-customer.use-case';
import { CustomerNotFoundException } from '../../src/customers/domain/exceptions/customer-not-found.exception';
import { EmailAlreadyExistsException } from '../../src/customers/domain/exceptions/email-already-exists.exception';
import {
  createAdapters,
  createTestingModule,
  TestAdapters,
} from '../support/testing-module';

describe('Casos de uso de clientes (integración con adaptadores en memoria)', () => {
  let adapters: TestAdapters;
  let moduleRef: TestingModule;
  let createCustomer: CreateCustomerUseCase;

  beforeEach(async () => {
    adapters = createAdapters();
    moduleRef = await createTestingModule(adapters);
    createCustomer = moduleRef.get(CreateCustomerUseCase);
  });

  it('crea un cliente activo con UUID y lo persiste', async () => {
    const customer = await createCustomer.execute({
      name: 'Ana Torres',
      email: 'ana@example.com',
    });

    expect(customer.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(customer.isActive).toBe(true);
    await expect(adapters.customers.findById(customer.id)).resolves.toBe(
      customer,
    );
  });

  it('rechaza un email ya registrado con 409', async () => {
    await createCustomer.execute({ name: 'Ana', email: 'ana@example.com' });

    const error: unknown = await createCustomer
      .execute({ name: 'Otra Ana', email: 'ana@example.com' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(EmailAlreadyExistsException);
    expect((error as EmailAlreadyExistsException).statusCode).toBe(409);
    await expect(adapters.customers.findAll()).resolves.toHaveLength(1);
  });

  it('consulta un cliente por id o lanza 404', async () => {
    const created = await createCustomer.execute({
      name: 'Ana',
      email: 'ana@example.com',
    });
    const getCustomer = moduleRef.get(GetCustomerUseCase);

    await expect(getCustomer.execute(created.id)).resolves.toBe(created);
    await expect(getCustomer.execute('no-existe')).rejects.toThrow(
      CustomerNotFoundException,
    );
  });

  it('lista todos los clientes', async () => {
    await createCustomer.execute({ name: 'Ana', email: 'ana@example.com' });
    await createCustomer.execute({ name: 'Luis', email: 'luis@example.com' });

    await expect(
      moduleRef.get(GetAllCustomersUseCase).execute(),
    ).resolves.toHaveLength(2);
  });
});
