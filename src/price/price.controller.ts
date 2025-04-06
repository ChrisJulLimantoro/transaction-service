import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { Exempt } from 'src/decorator/exempt.decorator';
import { PriceService } from './price.service';
import { RmqAckHelper } from 'src/helper/rmq-ack.helper';

@Controller('price')
export class PriceController {
  constructor(private readonly service: PriceService) {}

  @EventPattern({ cmd: 'price_created' })
  @Exempt()
  async priceCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.create(data),
      {
        queueName: 'price_created',
        useDLQ: true,
        dlqRoutingKey: 'dlq.price_created',
      },
    )();
  }

  @EventPattern({ cmd: 'price_updated' })
  @Exempt()
  async priceUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.update(data.id, data),
      {
        queueName: 'price_updated',
        useDLQ: true,
        dlqRoutingKey: 'dlq.price_updated',
      },
    )();
  }

  @EventPattern({ cmd: 'price_deleted' })
  @Exempt()
  async priceDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.delete(data),
      {
        queueName: 'price_deleted',
        useDLQ: true,
        dlqRoutingKey: 'dlq.price_deleted',
      },
    )();
  }
}
