import { Policy } from '../../domain/policy.entity';
import { Coverage } from '../../domain/value-objects/coverage.vo';
import { RiskProfile } from '../../domain/value-objects/risk-profile.vo';
import { PolicyOrmEntity } from './policy.orm-entity';

export class PolicyMapper {
  static toDomain(orm: PolicyOrmEntity): Policy {
    return new Policy({
      id: orm.id,
      policyNumber: orm.policyNumber,
      customerId: orm.customerId,
      branch: orm.branch,
      ratingStrategy: orm.ratingStrategy,
      status: orm.status,
      coverage: Coverage.fromPlainObject(orm.coverage as any),
      monthlyPremium: Number(orm.monthlyPremium),
      riskProfile: RiskProfile.fromPlainObject(orm.riskProfile as any),
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: Policy): PolicyOrmEntity {
    const orm = new PolicyOrmEntity();
    orm.id = domain.id;
    orm.policyNumber = domain.policyNumber;
    orm.customerId = domain.customerId;
    orm.branch = domain.branch;
    orm.ratingStrategy = domain.ratingStrategy;
    orm.status = domain.status;
    orm.coverage = domain.coverage.toPlainObject();
    orm.monthlyPremium = domain.monthlyPremium;
    orm.riskProfile = domain.riskProfile.toPlainObject();
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
