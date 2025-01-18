import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { Exempt } from 'src/decorator/exempt.decorator';
import { PriceService } from './price.service';

@Controller('price')
export class PriceController {
  constructor(private readonly service: PriceService) {}

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

  @EventPattern({ cmd: 'price_created' })
  @Exempt()
  async priceCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    await this.handleEvent(
      context,
      () => this.service.create(data),
      'Error processing price_created event',
    );
  }

  @EventPattern({ cmd: 'price_updated' })
  @Exempt()
  async priceUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    await this.handleEvent(
      context,
      () => this.service.update(data.id, data),
      'Error processing price_updated event',
    );
  }

  @EventPattern({ cmd: 'price_deleted' })
  @Exempt()
  async priceDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    await this.handleEvent(
      context,
      () => this.service.delete(data),
      'Error processing price_deleted event',
    );
  }
}
