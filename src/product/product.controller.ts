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
import { RmqHelper } from 'src/helper/rmq.helper';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('product')
export class ProductController {
  constructor(
    private readonly service: ProductService,
    private readonly prisma: PrismaService,
  ) {}

  @EventPattern('product.created')
  @Exempt()
  async productCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.create(data.data, data.user),
      {
        queueName: 'product.created',
        useDLQ: true,
        dlqRoutingKey: 'dlq.product.created',
        prisma: this.prisma,
      },
    )();
  }

  @EventPattern('product.updated')
  @Exempt()
  async productUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.update(data.data.id, data.data, data.user),
      {
        queueName: 'product.updated',
        useDLQ: true,
        dlqRoutingKey: 'dlq.product.updated',
        prisma: this.prisma,
      },
    )();
  }

  @EventPattern('product.deleted')
  @Exempt()
  async productDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.delete(data.data.id, data.user),
      {
        queueName: 'product.deleted',
        useDLQ: true,
        dlqRoutingKey: 'dlq.product.deleted',
        prisma: this.prisma,
      },
    )();
  }

  @EventPattern('product.code.created')
  @Exempt()
  async productCodeGenerated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.generateProductCode(data.data),
      {
        queueName: 'product.code.created',
        useDLQ: true,
        dlqRoutingKey: 'dlq.product.code.created',
        prisma: this.prisma,
      },
    )();
  }

  @EventPattern('product.code.updated')
  @Exempt()
  async productCodeUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.updateProductCode(data.data.id, data.data),
      {
        queueName: 'product.code.updated',
        useDLQ: true,
        dlqRoutingKey: 'dlq.product.code.updated',
        prisma: this.prisma,
      },
    )();
  }

  @EventPattern('product.code.deleted')
  @Exempt()
  async productCodeDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.deleteProductCode(data.data.id),
      {
        queueName: 'product.code.deleted',
        useDLQ: true,
        dlqRoutingKey: 'dlq.product.code.deleted',
        prisma: this.prisma,
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
