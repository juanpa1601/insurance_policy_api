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
    // 1) Se verifica que el cliente exista y esté activo en BD.
    //    Si no existe o está inactivo, se lanza CustomerNotFoundException (HTTP 404).
    const customer: Customer | null = await this.customerRepository.findById(command.customerId);
    if (!customer || !customer.isActive) {
      throw new CustomerNotFoundException(command.customerId);
    }

    // 2) Se resuelve la factory correspondiente al ramo (AUTO, LIFE, HOME, HEALTH)
    //    usando el Map construido en el constructor. Sin switch. Si el ramo no está
    //    registrado, se lanza UnsupportedBranchException (HTTP 400).
    const factory: PolicyFactoryPort | undefined = this.factoryMap.get(command.branch);
    if (!factory) throw new UnsupportedBranchException(command.branch);

    // 3) Se resuelve la estrategia de tarificación (STANDARD, RISK_BASED, LOYALTY)
    //    usando el Map de estrategias. Sin switch. Si la estrategia no está registrada,
    //    se lanza UnsupportedRatingStrategyException (HTTP 400).
    const strategy: RatingStrategyPort | undefined = this.strategyMap.get(command.ratingStrategy);
    if (!strategy) throw new UnsupportedRatingStrategyException(command.ratingStrategy);

    // 4) Se construye el Value Object RiskProfile a partir de los datos del comando.
    const riskProfile: RiskProfile = new RiskProfile(command.riskProfile);

    // 5) Se delega a la estrategia la validación de los datos del perfil de riesgo.
    //    Ej: RISK_BASED exige riskScore [0-100]; LOYALTY exige customerSince con antigüedad >= 2 años.
    strategy.validate(riskProfile);

    // 6) Se delega a la factory la creación de la cobertura por defecto del ramo
    //    (coverageAmount, deductible, termMonths, etc.) y la obtención de la prima base.
    const coverage: Coverage = factory.createDefaultCoverage();
    const basePremium: number = factory.getBasePremium();

    // 7) Se delega a la estrategia el cálculo de la prima mensual ajustada
    //    aplicando el factor correspondiente sobre la prima base del ramo.
    const monthlyPremium: number = strategy.calculatePremium(
      basePremium,
      riskProfile
    );

    // 8) Se ensambla la póliza usando el Builder de forma fluida.
    //    build() valida que todos los campos requeridos estén presentes
    //    y asigna PolicyStatus.QUOTED como estado inicial obligatorio.
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

    // 9) Se persiste la póliza en BD y se retorna la entidad guardada.
    return this.policyRepository.save(policy);
  }
}
