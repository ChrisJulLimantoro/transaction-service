import { Controller } from '@nestjs/common';
import { AccountService } from './account.service';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { Exempt } from 'src/decorator/exempt.decorator';
import { RmqAckHelper } from '../helper/rmq-ack.helper';

@Controller()
export class AccountController {
  constructor(private readonly service: AccountService) {}

  @EventPattern({ cmd: 'account_created' })
  @Exempt()
  async accountCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.create(data),
      {
        queueName: 'account_created',
        useDLQ: true,
        dlqRoutingKey: 'dlq.account_created',
      },
    )();
  }

  @EventPattern({ cmd: 'account_updated' })
  @Exempt()
  async accountUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.update(data.id, data),
      {
        queueName: 'account_updated',
        useDLQ: true,
        dlqRoutingKey: 'dlq.account_updated',
      },
    )();
  }

  @EventPattern({ cmd: 'account_deleted' })
  @Exempt()
  async accountDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.delete(data),
      {
        queueName: 'account_deleted',
        useDLQ: true,
        dlqRoutingKey: 'dlq.account_deleted',
      },
    )();
  }
}
