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
import { RmqAckHelper } from 'src/helper/rmq-ack.helper';

@Controller('store')
export class StoreController {
  constructor(private readonly service: StoreService) {}

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
    console.log('Store created emit received', data);

    const sanitizedData = {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      deleted_at: data.deleted_at ? new Date(data.deleted_at) : null,
    };

    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.create(sanitizedData),
      {
        queueName: 'store_created',
        useDLQ: true,
        dlqRoutingKey: 'dlq.store_created',
      },
    )();
  }

  @EventPattern({ cmd: 'store_updated' })
  @Exempt()
  async storeUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('Store updated emit received', data);

    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.update(data.id, data),
      {
        queueName: 'store_updated',
        useDLQ: true,
        dlqRoutingKey: 'dlq.store_updated',
      },
    )();
  }

  @EventPattern({ cmd: 'store_deleted' })
  @Exempt()
  async storeDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('Store deleted emit received', data);

    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.delete(data),
      {
        queueName: 'store_deleted',
        useDLQ: true,
        dlqRoutingKey: 'dlq.store_deleted',
      },
    )();
  }

  @EventPattern({ cmd: 'store_sync' })
  @Exempt()
  async storeSync(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.sync(data),
      {
        queueName: 'store_sync',
        useDLQ: true,
        dlqRoutingKey: 'dlq.store_sync',
      },
    )();
  }
}
