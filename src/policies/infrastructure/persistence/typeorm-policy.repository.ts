import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Policy } from '../../domain/policy.entity';
import type { PolicyRepositoryPort } from '../../domain/ports/policy.repository.port';
import { PolicyOrmEntity } from './policy.orm-entity';
import { PolicyMapper } from './policy.mapper';

@Injectable()
export class TypeOrmPolicyRepository implements PolicyRepositoryPort {
  constructor(
    @InjectRepository(PolicyOrmEntity)
    private readonly ormRepository: Repository<PolicyOrmEntity>,
  ) {}

  async save(policy: Policy): Promise<Policy> {
    const orm: PolicyOrmEntity = PolicyMapper.toOrm(policy);
    const saved = await this.ormRepository.save(orm);
    return PolicyMapper.toDomain(saved);
  }

  async findById(id: string): Promise<Policy | null> {
    const orm: PolicyOrmEntity | null = await this.ormRepository.findOne({ where: { id } });
    return orm ? PolicyMapper.toDomain(orm) : null;
  }

  async findByCustomerId(customerId: string): Promise<Policy[]> {
    const orms: PolicyOrmEntity[] = await this.ormRepository.find({ where: { customerId } });
    return orms.map(PolicyMapper.toDomain);
  }

  async findAll(): Promise<Policy[]> {
    const orms: PolicyOrmEntity[] = await this.ormRepository.find();
    return orms.map(PolicyMapper.toDomain);
  }

  async findMaxSequence(): Promise<number> {
    const result = await this.ormRepository
      .createQueryBuilder('policy')
      .select('MAX(CAST(SPLIT_PART(policy.policyNumber, \'-\', 3) AS INTEGER))', 'max')
      .getRawOne<{ max: string | null }>();
    return result?.max ? parseInt(result.max, 10) : 0;
  }
}
