import { Customer } from '../../domain/customer.entity';
import { CustomerOrmEntity } from './customer.orm-entity';

export class CustomerMapper {
  static toDomain(orm: CustomerOrmEntity): Customer {
    return new Customer({
      id: orm.id,
      name: orm.name,
      email: orm.email,
      isActive: orm.isActive,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt
    });
  }

  static toOrm(domain: Customer): CustomerOrmEntity {
    const orm: CustomerOrmEntity = new CustomerOrmEntity();
    orm.id = domain.id;
    orm.name = domain.name;
    orm.email = domain.email;
    orm.isActive = domain.isActive;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
