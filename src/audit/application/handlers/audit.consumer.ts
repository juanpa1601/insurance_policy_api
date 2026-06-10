import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import type { PolicyDomainEvent } from '../../../shared/events/domain/policy-domain-event';
import { PolicyTopics } from '../../../shared/events/domain/policy-domain-event';

@Controller()
export class AuditConsumer {
  private readonly logger = new Logger(AuditConsumer.name);

  @EventPattern(PolicyTopics.ISSUED)
  auditPolicyIssued(@Payload() event: PolicyDomainEvent): void {
    this.logAudit(event);
  }

  @EventPattern(PolicyTopics.ACTIVATED)
  auditPolicyActivated(@Payload() event: PolicyDomainEvent): void {
    this.logAudit(event);
  }

  @EventPattern(PolicyTopics.SUSPENDED)
  auditPolicySuspended(@Payload() event: PolicyDomainEvent): void {
    this.logAudit(event);
  }

  @EventPattern(PolicyTopics.REACTIVATED)
  auditPolicyReactivated(@Payload() event: PolicyDomainEvent): void {
    this.logAudit(event);
  }

  @EventPattern(PolicyTopics.CANCELLED)
  auditPolicyCancelled(@Payload() event: PolicyDomainEvent): void {
    this.logAudit(event);
  }

  private logAudit(event: PolicyDomainEvent): void {
    this.logger.log(
      `[AUDIT] policy=${event.policyNumber} | ${event.oldStatus} → ${event.newStatus} | customer=${event.customerId} | branch=${event.branch} | at=${event.timestamp}`,
    );
  }
}
