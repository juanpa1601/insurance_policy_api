import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerOrmEntity } from './infrastructure/persistence/customer.orm-entity';
import { TypeOrmCustomerRepository } from './infrastructure/persistence/typeorm-customer.repository';
import { CreateCustomerUseCase } from './application/use-cases/create-customer.use-case';
import { GetCustomerUseCase } from './application/use-cases/get-customer.use-case';
import { GetAllCustomersUseCase } from './application/use-cases/get-all-customers.use-case';
import { CustomersController } from './infrastructure/http/customers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerOrmEntity])],
  controllers: [CustomersController],
  providers: [
    // Adapter: conecta el token del port con la implementación concreta
    {
      provide: 'CustomerRepositoryPort',
      useClass: TypeOrmCustomerRepository,
    },
    CreateCustomerUseCase,
    GetCustomerUseCase,
    GetAllCustomersUseCase,
  ],
  // Exportamos el port para que PoliciesModule pueda verificar si un cliente existe
  exports: ['CustomerRepositoryPort'],
})
export class CustomersModule {}
