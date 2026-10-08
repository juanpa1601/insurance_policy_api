import { Logger } from '@nestjs/common';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { AuditConsumer } from '../../audit/application/handlers/audit.consumer';
import { NotificationsConsumer } from '../../notifications/application/handlers/notifications.consumer';
import { Branch } from '../../policies/domain/enums/branch.enum';
import { PolicyStatus } from '../../policies/domain/enums/policy-status.enum';
import { PolicyDomainEvent, PolicyTopics } from './domain/policy-domain-event';

type Handler = (event: PolicyDomainEvent) => void;

// Devuelve el handler que Nest registra para cada topic (@EventPattern).
const handlersByTopic = (consumer: object): Map<string, Handler> => {
  const prototype = Object.getPrototypeOf(consumer) as Record<string, unknown>;
  const handlers = new Map<string, Handler>();
  for (const name of Object.getOwnPropertyNames(prototype)) {
    const method = prototype[name];
    if (typeof method !== 'function') continue;
    const patterns = Reflect.getMetadata(PATTERN_METADATA, method) as
      | string[]
      | undefined;
    for (const pattern of patterns ?? []) {
      handlers.set(pattern, (e: PolicyDomainEvent): void => {
        (method as Handler).call(consumer, e);
      });
    }
  }
  return handlers;
};

const event: PolicyDomainEvent = {
  policyId: 'policy-1',
  policyNumber: 'POL-2026-000007',
  customerId: 'customer-1',
  branch: Branch.AUTO,
  oldStatus: PolicyStatus.QUOTED,
  newStatus: PolicyStatus.ISSUED,
  timestamp: '2026-10-08T00:00:00.000Z',
};

const ALL_TOPICS: string[] = Object.values(PolicyTopics);

describe.each([
  ['NotificationsConsumer', new NotificationsConsumer(), '[NOTIFICATION]'],
  ['AuditConsumer', new AuditConsumer(), '[AUDIT]'],
])('%s (Observer)', (_name, consumer, prefix) => {
  const handlers = handlersByTopic(consumer);

  afterEach(() => jest.restoreAllMocks());

  it('se suscribe a los 5 topics de la póliza', () => {
    expect([...handlers.keys()].sort()).toEqual([...ALL_TOPICS].sort());
  });

  it.each(ALL_TOPICS)('registra el evento de %s', (topic) => {
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);

    handlers.get(topic)!(event);

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining(`${prefix} `) as string,
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining(event.policyNumber) as string,
    );
  });
});
