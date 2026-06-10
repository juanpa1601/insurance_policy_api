import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import type { PolicyDomainEvent } from '../../../shared/events/domain/policy-domain-event';
import { PolicyTopics } from '../../../shared/events/domain/policy-domain-event';

@Controller()
export class NotificationsConsumer {
  private readonly logger = new Logger(NotificationsConsumer.name);

  @EventPattern(PolicyTopics.ISSUED)
  handlePolicyIssued(@Payload() event: PolicyDomainEvent): void {
    this.logger.log(`[NOTIFICATION] Policy ${event.policyNumber} issued for customer ${event.customerId}`);
  }

  @EventPattern(PolicyTopics.ACTIVATED)
  handlePolicyActivated(@Payload() event: PolicyDomainEvent): void {
    this.logger.log(`[NOTIFICATION] Policy ${event.policyNumber} is now ACTIVE`);
  }

  @EventPattern(PolicyTopics.SUSPENDED)
  handlePolicySuspended(@Payload() event: PolicyDomainEvent): void {
    this.logger.log(`[NOTIFICATION] Policy ${event.policyNumber} has been SUSPENDED`);
  }

  @EventPattern(PolicyTopics.REACTIVATED)
  handlePolicyReactivated(@Payload() event: PolicyDomainEvent): void {
    this.logger.log(`[NOTIFICATION] Policy ${event.policyNumber} has been REACTIVATED`);
  }

  @EventPattern(PolicyTopics.CANCELLED)
  handlePolicyCancelled(@Payload() event: PolicyDomainEvent): void {
    this.logger.log(`[NOTIFICATION] Policy ${event.policyNumber} has been CANCELLED`);
  }
}
