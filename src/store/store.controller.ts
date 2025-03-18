import { Controller } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { Exempt } from 'src/decorator/exempt.decorator';
import { StoreService } from './store.service';
import { Describe } from 'src/decorator/describe.decorator';

@Controller('store')
export class StoreController {
  constructor(private readonly service: StoreService) {}

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

  @MessagePattern({ cmd: 'get:store/*' })
  @Describe({
    description: 'Get Store By ID',
    fe: ['marketplace/balance:open'],
  })
  async getStore(@Payload() data: any): Promise<any> {
    const id = data.params.id;
    return await this.service.findOne(id);
  }

  @EventPattern({ cmd: 'store_created' })
  @Exempt()
  async storeCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    await this.handleEvent(
      context,
      () => this.service.create(data),
      'Error processing store_created event',
    );
  }

  @EventPattern({ cmd: 'store_updated' })
  @Exempt()
  async storeUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    await this.handleEvent(
      context,
      () => this.service.update(data.id, data),
      'Error processing store_updated event',
    );
  }

  @EventPattern({ cmd: 'store_deleted' })
  @Exempt()
  async storeDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    await this.handleEvent(
      context,
      () => this.service.delete(data),
      'Error processing store_deleted event',
    );
  }
  
  @EventPattern({ cmd: 'store_sync' })
  @Exempt()
  async storeSync(@Payload() data: any, @Ctx() context: RmqContext) {
    await this.handleEvent(
      context,
      () => this.service.sync(data),
      'Error processing store_sync event',
    );
  }
}
