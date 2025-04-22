import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { Exempt } from 'src/decorator/exempt.decorator';
import { TypeService } from './type.service';
import { RmqHelper } from 'src/helper/rmq.helper';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('type')
export class TypeController {
  constructor(
    private readonly service: TypeService,
    private readonly prisma: PrismaService,
  ) {}

  @EventPattern('type.created')
  @Exempt()
  async typeCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.create(data.data, data.user),
      {
        queueName: 'type.created',
        useDLQ: true,
        dlqRoutingKey: 'dlq.type.created',
        prisma: this.prisma,
      },
    )();
  }

  @EventPattern('type.updated')
  @Exempt()
  async typeUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.update(data.data.id, data.data, data.user),
      {
        queueName: 'type.updated',
        useDLQ: true,
        dlqRoutingKey: 'dlq.type.updated',
      },
    )();
  }

  @EventPattern('type.deleted')
  @Exempt()
  async typeDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.delete(data.data, data.user),
      {
        queueName: 'type.deleted',
        useDLQ: true,
        dlqRoutingKey: 'dlq.type.deleted',
      },
    )();
  }
}
