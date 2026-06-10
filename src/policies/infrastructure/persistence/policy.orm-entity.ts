import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn
} from 'typeorm';
import { Branch } from '../../domain/enums/branch.enum';
import { PolicyStatus } from '../../domain/enums/policy-status.enum';
import { RatingStrategyType } from '../../domain/enums/rating-strategy-type.enum';

@Entity('policies')
export class PolicyOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 30 })
  policyNumber!: string;

  @Column('uuid')
  customerId!: string;

  @Column({ type: 'enum', enum: Branch })
  branch!: Branch;

  @Column({ type: 'enum', enum: RatingStrategyType })
  ratingStrategy!: RatingStrategyType;

  @Column({ type: 'enum', enum: PolicyStatus })
  status!: PolicyStatus;

  @Column({ type: 'jsonb' })
  coverage!: object;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monthlyPremium!: number;

  @Column({ type: 'jsonb' })
  riskProfile!: object;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
