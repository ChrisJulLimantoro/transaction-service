import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { Exempt } from 'src/decorator/exempt.decorator';
import { PriceService } from './price.service';
import { RmqHelper } from 'src/helper/rmq.helper';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('price')
export class PriceController {
  constructor(
    private readonly service: PriceService,
    private readonly prisma: PrismaService,
  ) {}

  @EventPattern('price.created')
  @Exempt()
  async priceCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.create(data.data, data.user),
      {
        queueName: 'price.created',
        useDLQ: true,
        dlqRoutingKey: 'dlq.price.created',
        prisma: this.prisma,
      },
    )();
  }

  @EventPattern('price.updated')
  @Exempt()
  async priceUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.update(data.data.id, data.data, data.user),
      {
        queueName: 'price.updated',
        useDLQ: true,
        dlqRoutingKey: 'dlq.price.updated',
        prisma: this.prisma,
      },
    )();
  }

  @EventPattern('price.deleted')
  @Exempt()
  async priceDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.delete(data.data.id, data.user),
      {
        queueName: 'price.deleted',
        useDLQ: true,
        dlqRoutingKey: 'dlq.price.deleted',
        prisma: this.prisma,
      },
    )();
  }
}
