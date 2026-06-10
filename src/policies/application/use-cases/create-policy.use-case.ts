import { 
  Inject, 
  Injectable 
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Policy } from '../../domain/policy.entity';
import { Branch } from '../../domain/enums/branch.enum';
import { RatingStrategyType } from '../../domain/enums/rating-strategy-type.enum';
import type { PolicyRepositoryPort } from '../../domain/ports/policy.repository.port';
import type { PolicyFactoryPort } from '../../domain/ports/policy-factory.port';
import type { RatingStrategyPort } from '../../domain/ports/rating-strategy.port';
import type { CustomerRepositoryPort } from '../../../customers/domain/ports/customer.repository.port';
import type { EventPublisherPort } from '../../../shared/events/domain/ports/event-publisher.port';
import { RiskProfile } from '../../domain/value-objects/risk-profile.vo';
import { PolicyBuilder } from '../builders/policy.builder';
import { UnsupportedBranchException } from '../../domain/exceptions/unsupported-branch.exception';
import { UnsupportedRatingStrategyException } from '../../domain/exceptions/unsupported-rating-strategy.exception';
import { CustomerNotFoundException } from '../../../customers/domain/exceptions/customer-not-found.exception';
import { PolicyNumberSequencer } from '../../../config/policy-number.sequencer';
import { Customer } from '../../../customers/domain/customer.entity';
import { Coverage } from '../../domain/value-objects/coverage.vo';

export interface CreatePolicyCommand {
  customerId: string;
  branch: Branch;
  ratingStrategy: RatingStrategyType;
  riskProfile: { riskScore?: number; customerSince?: number };
}

@Injectable()
export class CreatePolicyUseCase {
  private readonly factoryMap: Map<Branch, PolicyFactoryPort>;
  private readonly strategyMap: Map<RatingStrategyType, RatingStrategyPort>;

  constructor(
    @Inject('PolicyRepositoryPort')
    private readonly policyRepository: PolicyRepositoryPort,
    @Inject('CustomerRepositoryPort')
    private readonly customerRepository: CustomerRepositoryPort,
    @Inject('POLICY_FACTORIES')
    factories: PolicyFactoryPort[],
    @Inject('RATING_STRATEGIES')
    strategies: RatingStrategyPort[],
    @Inject('EventPublisherPort')
    private readonly eventPublisher: EventPublisherPort,
    private readonly sequencer: PolicyNumberSequencer,
  ) {
    // Se construye el mapa una sola vez en el constructor.
    // Agregar un 5to ramo o una 4ta estrategia = una clase nueva + registro en el modulo.
    // Este use case no cambia. Eso es OCP.
    this.factoryMap = new Map(factories.map((f) => [f.getBranch(), f]));
    this.strategyMap = new Map(strategies.map((s) => [s.getName(), s]));
  }

  async execute(command: CreatePolicyCommand): Promise<Policy> {
    const customer: Customer | null = await this.customerRepository.findById(command.customerId);
    if (!customer || !customer.isActive) {
      throw new CustomerNotFoundException(command.customerId);
    }

    const factory: PolicyFactoryPort | undefined = this.factoryMap.get(command.branch);
    if (!factory) throw new UnsupportedBranchException(command.branch);

    const strategy: RatingStrategyPort | undefined = this.strategyMap.get(command.ratingStrategy);
    if (!strategy) throw new UnsupportedRatingStrategyException(command.ratingStrategy);

    const riskProfile: RiskProfile = new RiskProfile(command.riskProfile);

    // Strategy: valida los datos antes de calcular
    strategy.validate(riskProfile);

    // Factory Method: produce la cobertura del ramo sin switch
    const coverage: Coverage = factory.createDefaultCoverage();
    const basePremium: number = factory.getBasePremium();

    // Strategy: calcula la prima ajustada
    const monthlyPremium: number = strategy.calculatePremium(
      basePremium, 
      riskProfile
    );

    // Builder: ensambla la poliza de forma fluida; build() asigna QUOTED
    const policy: Policy = new PolicyBuilder()
      .withId(uuidv4())
      .withPolicyNumber(this.sequencer.next())
      .withCustomerId(command.customerId)
      .withBranch(command.branch)
      .withRatingStrategy(command.ratingStrategy)
      .withCoverage(coverage)
      .withMonthlyPremium(monthlyPremium)
      .withRiskProfile(riskProfile)
      .build();

    return this.policyRepository.save(policy);
  }
}
