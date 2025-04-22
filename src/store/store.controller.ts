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
import { RmqHelper } from 'src/helper/rmq.helper';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('store')
export class StoreController {
  constructor(
    private readonly service: StoreService,
    private readonly prisma: PrismaService,
  ) {}

  @MessagePattern({ cmd: 'get:store/*' })
  @Describe({
    description: 'Get Store By ID',
    fe: ['marketplace/balance:open'],
  })
  async getStore(@Payload() data: any): Promise<any> {
    const id = data.params.id;
    return await this.service.findOne(id);
  }

  @EventPattern('store.created')
  @Exempt()
  async storeCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('Store created emit received', data);

    const sanitizedData = {
      ...data.data,
      created_at: new Date(data.data.created_at),
      updated_at: new Date(data.data.updated_at),
      deleted_at: data.data.deleted_at ? new Date(data.data.deleted_at) : null,
    };

    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.create(sanitizedData, data.user),
      {
        queueName: 'store.created',
        useDLQ: true,
        dlqRoutingKey: 'dlq.store.created',
        prisma: this.prisma,
      },
    )();
  }

  @EventPattern('store.updated')
  @Exempt()
  async storeUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('Store updated emit received', data);

    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.update(data.data.id, data.data, data.user),
      {
        queueName: 'store.updated',
        useDLQ: true,
        dlqRoutingKey: 'dlq.store.updated',
        prisma: this.prisma,
      },
    )();
  }

  @EventPattern('store.deleted')
  @Exempt()
  async storeDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('Store deleted emit received', data);

    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.delete(data.data, data.user),
      {
        queueName: 'store.deleted',
        useDLQ: true,
        dlqRoutingKey: 'dlq.store.deleted',
        prisma: this.prisma,
      },
    )();
  }

  @EventPattern('store.sync')
  @Exempt()
  async storeSync(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.sync(data.data),
      {
        queueName: 'store.sync',
        useDLQ: true,
        dlqRoutingKey: 'dlq.store.sync',
        prisma: this.prisma,
      },
    )();
  }
}
