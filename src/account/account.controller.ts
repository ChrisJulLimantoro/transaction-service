import { Controller } from '@nestjs/common';
import { AccountService } from './account.service';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { Exempt } from 'src/decorator/exempt.decorator';
import { RmqHelper } from '../helper/rmq.helper';

@Controller()
export class AccountController {
  constructor(private readonly service: AccountService) {}

  @EventPattern('account.created')
  @Exempt()
  async accountCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.create(data),
      {
        queueName: 'account.created',
        useDLQ: true,
        dlqRoutingKey: 'dlq.account.created',
      },
    )();
  }

  @EventPattern('account.updated')
  @Exempt()
  async accountUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.update(data.id, data),
      {
        queueName: 'account.updated',
        useDLQ: true,
        dlqRoutingKey: 'dlq.account.updated',
      },
    )();
  }

  @EventPattern('account.deleted')
  @Exempt()
  async accountDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.delete(data),
      {
        queueName: 'account.deleted',
        useDLQ: true,
        dlqRoutingKey: 'dlq.account.deleted',
      },
    )();
  }
}
