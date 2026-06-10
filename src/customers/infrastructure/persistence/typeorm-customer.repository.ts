import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../domain/customer.entity';
import { CustomerRepositoryPort } from '../../domain/ports/customer.repository.port';
import { CustomerOrmEntity } from './customer.orm-entity';
import { CustomerMapper } from './customer.mapper';

@Injectable()
export class TypeOrmCustomerRepository implements CustomerRepositoryPort {
  constructor(
    @InjectRepository(CustomerOrmEntity)
    private readonly ormRepository: Repository<CustomerOrmEntity>,
  ) {}

  async save(customer: Customer): Promise<Customer> {
    const orm: CustomerOrmEntity = CustomerMapper.toOrm(customer);
    const saved: CustomerOrmEntity = await this.ormRepository.save(orm);
    return CustomerMapper.toDomain(saved);
  }

  async findById(id: string): Promise<Customer | null> {
    const orm: CustomerOrmEntity | null = await this.ormRepository.findOne({ where: { id } });
    return orm ? CustomerMapper.toDomain(orm) : null;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const orm: CustomerOrmEntity | null = await this.ormRepository.findOne({ where: { email } });
    return orm ? CustomerMapper.toDomain(orm) : null;
  }
}
