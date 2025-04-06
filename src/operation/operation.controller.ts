import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { Exempt } from 'src/decorator/exempt.decorator';
import { OperationService } from './operation.service';
import { RmqAckHelper } from 'src/helper/rmq-ack.helper';

@Controller('operation')
export class OperationController {
  constructor(private readonly service: OperationService) {}

  @EventPattern({ cmd: 'operation_created' })
  @Exempt()
  async operationCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('operation data created', data);
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.create(data),
      {
        queueName: 'operation_created',
        useDLQ: true,
        dlqRoutingKey: 'dlq.operation_created',
      },
    )();
  }

  @EventPattern({ cmd: 'operation_updated' })
  @Exempt()
  async operationUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.update(data.id, data),
      {
        queueName: 'operation_updated',
        useDLQ: true,
        dlqRoutingKey: 'dlq.operation_updated',
      },
    )();
  }

  @EventPattern({ cmd: 'operation_deleted' })
  @Exempt()
  async operationDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.delete(data),
      {
        queueName: 'operation_deleted',
        useDLQ: true,
        dlqRoutingKey: 'dlq.operation_deleted',
      },
    )();
  }
}
