import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { Exempt } from 'src/decorator/exempt.decorator';
import { OperationService } from './operation.service';
import { RmqHelper } from 'src/helper/rmq.helper';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('operation')
export class OperationController {
  constructor(
    private readonly service: OperationService,
    private readonly prisma: PrismaService,
  ) {}

  @EventPattern('operation.created')
  @Exempt()
  async operationCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('operation data created', data);
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.create(data.data, data.user),
      {
        queueName: 'operation.created',
        useDLQ: true,
        dlqRoutingKey: 'dlq.operation.created',
        prisma: this.prisma,
      },
    )();
  }

  @EventPattern('operation.updated')
  @Exempt()
  async operationUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.update(data.data.id, data.data, data.user),
      {
        queueName: 'operation.updated',
        useDLQ: true,
        dlqRoutingKey: 'dlq.operation.updated',
        prisma: this.prisma,
      },
    )();
  }

  @EventPattern('operation.deleted')
  @Exempt()
  async operationDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.delete(data.data, data.user),
      {
        queueName: 'operation.deleted',
        useDLQ: true,
        dlqRoutingKey: 'dlq.operation.deleted',
        prisma: this.prisma,
      },
    )();
  }
}
