import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { Exempt } from 'src/decorator/exempt.decorator';
import { CategoryService } from './category.service';
import { RmqAckHelper } from 'src/helper/rmq-ack.helper';

@Controller('category')
export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  private async handleEvent(
    context: RmqContext,
    callback: () => Promise<{ success: boolean }>,
    errorMessage: string,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const response = await callback();
      if (response.success) {
        channel.ack(originalMsg);
      }
    } catch (error) {
      console.error(errorMessage, error.stack);
      channel.nack(originalMsg);
    }
  }

  @EventPattern({ cmd: 'category_created' })
  @Exempt()
  async categoryCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.create(data),
      {
        queueName: 'category_created',
        useDLQ: true,
        dlqRoutingKey: 'dlq.category_created',
      },
    )();
  }

  @EventPattern({ cmd: 'category_updated' })
  @Exempt()
  async categoryUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.update(data.id, data),
      {
        queueName: 'category_updated',
        useDLQ: true,
        dlqRoutingKey: 'dlq.category_updated',
      },
    )();
  }

  @EventPattern({ cmd: 'category_deleted' })
  @Exempt()
  async categoryDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.delete(data),
      {
        queueName: 'category_deleted',
        useDLQ: true,
        dlqRoutingKey: 'dlq.category_deleted',
      },
    )();
  }
}
