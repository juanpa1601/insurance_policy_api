import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import type { PolicyRepositoryPort } from '../domain/ports/policy.repository.port';
import { PolicyNumberSequencer } from '../../config/policy-number.sequencer';

@Injectable()
export class PolicySequencerInitializer implements OnModuleInit {
  private readonly logger = new Logger(PolicySequencerInitializer.name);

  constructor(
    @Inject('PolicyRepositoryPort')
    private readonly policyRepository: PolicyRepositoryPort,
    private readonly sequencer: PolicyNumberSequencer,
  ) {}

  async onModuleInit(): Promise<void> {
    const max = await this.policyRepository.findMaxSequence();
    this.sequencer.initialize(max);
    this.logger.log(`Secuenciador inicializado en ${max}. Próximo número: POL-${new Date().getFullYear()}-${String(max + 1).padStart(6, '0')}`);
  }
}
