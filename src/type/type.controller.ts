import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { Exempt } from 'src/decorator/exempt.decorator';
import { TypeService } from './type.service';
import { RmqAckHelper } from 'src/helper/rmq-ack.helper';

@Controller('type')
export class TypeController {
  constructor(private readonly service: TypeService) {}

  @EventPattern({ cmd: 'type_created' })
  @Exempt()
  async typeCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.create(data),
      {
        queueName: 'type_created',
        useDLQ: true,
        dlqRoutingKey: 'dlq.type_created',
      },
    );
  }

  @EventPattern({ cmd: 'type_updated' })
  @Exempt()
  async typeUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.update(data.id, data),
      {
        queueName: 'type_updated',
        useDLQ: true,
        dlqRoutingKey: 'dlq.type_updated',
      },
    );
  }

  @EventPattern({ cmd: 'type_deleted' })
  @Exempt()
  async typeDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.delete(data),
      {
        queueName: 'type_deleted',
        useDLQ: true,
        dlqRoutingKey: 'dlq.type_deleted',
      },
    );
  }
}
