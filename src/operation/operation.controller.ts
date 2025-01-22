import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { Exempt } from 'src/decorator/exempt.decorator';
import { OperationService } from './operation.service';

@Controller('operation')
export class OperationController {
  constructor(private readonly service: OperationService) {}

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

  @EventPattern({ cmd: 'operation_created' })
  @Exempt()
  async operationCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    await this.handleEvent(
      context,
      () => this.service.create(data),
      'Error processing operation_created event',
    );
  }

  @EventPattern({ cmd: 'operation_updated' })
  @Exempt()
  async operationUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    await this.handleEvent(
      context,
      () => this.service.update(data.id, data),
      'Error processing operation_updated event',
    );
  }

  @EventPattern({ cmd: 'operation_deleted' })
  @Exempt()
  async operationDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    await this.handleEvent(
      context,
      () => this.service.delete(data),
      'Error processing operation_deleted event',
    );
  }
}
