import { Controller } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { Exempt } from 'src/decorator/exempt.decorator';
import { ProductService } from './product.service';
import { Describe } from 'src/decorator/describe.decorator';
import { RmqAckHelper } from 'src/helper/rmq-ack.helper';

@Controller('product')
export class ProductController {
  constructor(private readonly service: ProductService) {}

  @EventPattern({ cmd: 'product_created' })
  @Exempt()
  async productCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.create(data),
      {
        queueName: 'product_created',
        useDLQ: true,
        dlqRoutingKey: 'dlq.product_created',
      },
    )();
  }

  @EventPattern({ cmd: 'product_updated' })
  @Exempt()
  async productUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.update(data.id, data),
      {
        queueName: 'product_updated',
        useDLQ: true,
        dlqRoutingKey: 'dlq.product_updated',
      },
    )();
  }

  @EventPattern({ cmd: 'product_deleted' })
  @Exempt()
  async productDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.delete(data),
      {
        queueName: 'product_deleted',
        useDLQ: true,
        dlqRoutingKey: 'dlq.product_deleted',
      },
    )();
  }

  @EventPattern({ cmd: 'product_code_generated' })
  @Exempt()
  async productCodeGenerated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.generateProductCode(data),
      {
        queueName: 'product_code_generated',
        useDLQ: true,
        dlqRoutingKey: 'dlq.product_code_generated',
      },
    )();
  }

  @EventPattern({ cmd: 'product_code_updated' })
  @Exempt()
  async productCodeUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.updateProductCode(data.id, data),
      {
        queueName: 'product_code_updated',
        useDLQ: true,
        dlqRoutingKey: 'dlq.product_code_updated',
      },
    )();
  }

  @EventPattern({ cmd: 'product_code_deleted' })
  @Exempt()
  async productCodeDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqAckHelper.handleMessageProcessing(
      context,
      () => this.service.deleteProductCode(data.id),
      {
        queueName: 'product_code_deleted',
        useDLQ: true,
        dlqRoutingKey: 'dlq.product_code_deleted',
      },
    )();
  }

  @MessagePattern({ cmd: 'get:product-purchase/*' })
  @Describe({
    description: 'Get Product Purchase',
    fe: ['transaction/purchase:add', 'transaction/purchase:edit'],
  })
  async getProductPurchase(@Payload() data: any) {
    const id = data.params.id;
    const store = data.body.auth.store_id;
    return this.service.getProductPurchase(id, store, data.body.is_broken);
  }

  @MessagePattern({ cmd: 'get:purchase-non-product' })
  @Describe({
    description: 'Get Purchase Info',
    fe: ['transaction/purchase:add', 'transaction/purchase:edit'],
  })
  async getPurchaseInfo(@Payload() data: any) {
    const body = data.body;
    return this.service.getPurchaseNonProduct(
      body.type_id,
      body.auth.store_id,
      body.weight,
      body.is_broken,
    );
  }
}
