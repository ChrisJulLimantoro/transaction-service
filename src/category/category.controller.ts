import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { Exempt } from 'src/decorator/exempt.decorator';
import { CategoryService } from './category.service';
import { RmqHelper } from 'src/helper/rmq.helper';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('category')
export class CategoryController {
  constructor(
    private readonly service: CategoryService,
    private readonly prisma: PrismaService,
  ) {}

  @EventPattern('category.created')
  @Exempt()
  async categoryCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.create(data.data, data.user),
      {
        queueName: 'category.created',
        useDLQ: true,
        dlqRoutingKey: 'dlq.category.created',
        prisma: this.prisma,
      },
    )();
  }

  @EventPattern('category.updated')
  @Exempt()
  async categoryUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.update(data.data.id, data.data, data.user),
      {
        queueName: 'category.updated',
        useDLQ: true,
        dlqRoutingKey: 'dlq.category.updated',
        prisma: this.prisma,
      },
    )();
  }

  @EventPattern('category.deleted')
  @Exempt()
  async categoryDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.delete(data.data, data.user),
      {
        queueName: 'category.deleted',
        useDLQ: true,
        dlqRoutingKey: 'dlq.category.deleted',
        prisma: this.prisma,
      },
    )();
  }
}
