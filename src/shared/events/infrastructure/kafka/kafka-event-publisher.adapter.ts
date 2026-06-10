import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { PolicyDomainEvent } from '../../domain/policy-domain-event';
import type { EventPublisherPort } from '../../domain/ports/event-publisher.port';

@Injectable()
export class KafkaEventPublisherAdapter implements EventPublisherPort, OnModuleInit {
  constructor(
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.kafkaClient.connect();
  }

  async publish(topic: string, event: PolicyDomainEvent): Promise<void> {
    this.kafkaClient.emit(topic, { value: JSON.stringify(event) });
  }
}
