import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { 
  ClientsModule, 
  Transport 
} from '@nestjs/microservices';
import { 
  ConfigModule, 
  ConfigService 
} from '@nestjs/config';

// Infraestructura - persistencia
import { PolicyOrmEntity } from './infrastructure/persistence/policy.orm-entity';
import { TypeOrmPolicyRepository } from './infrastructure/persistence/typeorm-policy.repository';

// Infraestructura - HTTP
import { PoliciesController } from './infrastructure/http/policies.controller';

// Aplicacion - use cases
import { CreatePolicyUseCase } from './application/use-cases/create-policy.use-case';
import { ChangePolicyStatusUseCase } from './application/use-cases/change-policy-status.use-case';
import { GetPolicyUseCase } from './application/use-cases/get-policy.use-case';
import { GetPoliciesByCustomerUseCase } from './application/use-cases/get-policies-by-customer.use-case';
import { GetAllPoliciesUseCase } from './application/use-cases/get-all-policies.use-case';
import { PolicySequencerInitializer } from './application/policy-sequencer.initializer';

// Aplicacion - factories (Factory Method)
import { AutoPolicyFactory } from './application/factories/auto-policy.factory';
import { LifePolicyFactory } from './application/factories/life-policy.factory';
import { HomePolicyFactory } from './application/factories/home-policy.factory';
import { HealthPolicyFactory } from './application/factories/health-policy.factory';
import { TravelPolicyFactory } from './application/factories/travel-policy.factory';

// Aplicacion - strategies (Strategy)
import { StandardRatingStrategy } from './application/strategies/standard-rating.strategy';
import { RiskBasedRatingStrategy } from './application/strategies/risk-based-rating.strategy';
import { LoyaltyRatingStrategy } from './application/strategies/loyalty-rating.strategy';

// Dominio - states (State)
import { QuotedState } from './domain/states/quoted.state';
import { IssuedState } from './domain/states/issued.state';
import { ActiveState } from './domain/states/active.state';
import { SuspendedState } from './domain/states/suspended.state';
import { CancelledState } from './domain/states/cancelled.state';

// Shared - eventos (Observer)
import { KafkaEventPublisherAdapter } from '../shared/events/infrastructure/kafka/kafka-event-publisher.adapter';

// Shared - consumers
import { NotificationsConsumer } from '../notifications/application/handlers/notifications.consumer';
import { AuditConsumer } from '../audit/application/handlers/audit.consumer';

// Config - Singleton
import { InsuranceConfigRegistry } from '../config/insurance-config.registry';
import { PolicyNumberSequencer } from '../config/policy-number.sequencer';

// Customers - port para validar cliente
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PolicyOrmEntity]),
    CustomersModule, // importamos para acceder a CustomerRepositoryPort
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              brokers: [config.get<string>('KAFKA_BROKER', 'localhost:9092')],
            },
            consumer: {
              groupId: config.get<string>('KAFKA_GROUP_ID', 'insurance-group'),
            },
          },
        }),
      },
    ]),
  ],
  controllers: [
    PoliciesController,
    NotificationsConsumer, // Consumer 1 - Observer
    AuditConsumer,         // Consumer 2 - Observer
  ],
  providers: [
    // Singleton: una sola instancia gestionada por el contenedor de DI
    InsuranceConfigRegistry,
    PolicyNumberSequencer,

    // Repository port → adapter
    { 
      provide: 'PolicyRepositoryPort', 
      useClass: TypeOrmPolicyRepository 
    },

    // Event publisher port → adapter Kafka
    { 
      provide: 'EventPublisherPort', 
      useClass: KafkaEventPublisherAdapter 
    },

    // Factory Method: array de todas las factories; el use case construye el Map
    {
      provide: 'POLICY_FACTORIES',
      useFactory: (config: InsuranceConfigRegistry) => [
        new AutoPolicyFactory(config),
        new LifePolicyFactory(config),
        new HomePolicyFactory(config),
        new HealthPolicyFactory(config),
        new TravelPolicyFactory(config),
      ],
      inject: [InsuranceConfigRegistry],
    },

    // Strategy: array de todas las estrategias; el use case construye el Map
    {
      provide: 'RATING_STRATEGIES',
      useFactory: (config: InsuranceConfigRegistry) => [
        new StandardRatingStrategy(),
        new RiskBasedRatingStrategy(config),
        new LoyaltyRatingStrategy(config),
      ],
      inject: [InsuranceConfigRegistry],
    },

    // State: array de todos los estados; el use case construye el Map
    {
      provide: 'POLICY_STATES',
      useFactory: () => [
        new QuotedState(),
        new IssuedState(),
        new ActiveState(),
        new SuspendedState(),
        new CancelledState(),
      ],
    },

    // Use cases
    CreatePolicyUseCase,
    ChangePolicyStatusUseCase,
    GetPolicyUseCase,
    GetPoliciesByCustomerUseCase,
    GetAllPoliciesUseCase,

    // Inicialización del secuenciador al arrancar
    PolicySequencerInitializer,
  ],
})
export class PoliciesModule {}
