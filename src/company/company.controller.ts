import { Controller } from '@nestjs/common';
import { CompanyService } from './company.service';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { Exempt } from 'src/decorator/exempt.decorator';
import { RmqAckHelper } from 'src/helper/rmq-ack.helper';

@Controller('company')
export class CompanyController {
  constructor(private readonly service: CompanyService) {}

  @EventPattern({ cmd: 'company_created' })
  @Exempt()
  async companyCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.create(data),
      {
        queueName: 'company_created',
        useDLQ: true,
        dlqRoutingKey: 'dlq.company_created',
      },
    )();
  }

  @EventPattern({ cmd: 'company_updated' })
  @Exempt()
  async companyUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.update(data.id, data),
      {
        queueName: 'company_updated',
        useDLQ: true,
        dlqRoutingKey: 'dlq.company_updated',
      },
    )();
  }

  @EventPattern({ cmd: 'company_deleted' })
  @Exempt()
  async companyDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.delete(data),
      {
        queueName: 'company_deleted',
        useDLQ: true,
        dlqRoutingKey: 'dlq.company_deleted',
      },
    )();
  }

  @EventPattern({ cmd: 'company_sync' })
  @Exempt()
  async companySync(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.sync(data),
      {
        queueName: 'company_sync',
        useDLQ: true,
        dlqRoutingKey: 'dlq.company_sync',
      },
    )();
  }
}
