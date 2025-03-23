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

@Controller('product')
export class ProductController {
  constructor(private readonly service: ProductService) {}

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

  @EventPattern({ cmd: 'product_created' })
  @Exempt()
  async productCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    await this.handleEvent(
      context,
      () => this.service.create(data),
      'Error processing product_created event',
    );
  }

  @EventPattern({ cmd: 'product_updated' })
  @Exempt()
  async productUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    await this.handleEvent(
      context,
      () => this.service.update(data.id, data),
      'Error processing product_updated event',
    );
  }

  @EventPattern({ cmd: 'product_deleted' })
  @Exempt()
  async productDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    await this.handleEvent(
      context,
      () => this.service.delete(data),
      'Error processing product_deleted event',
    );
  }

  @EventPattern({ cmd: 'product_code_generated' })
  @Exempt()
  async productCodeGenerated(@Payload() data: any, @Ctx() context: RmqContext) {
    await this.handleEvent(
      context,
      () => this.service.generateProductCode(data),
      'Error processing product_code_generated event',
    );
  }

  @EventPattern({ cmd: 'product_code_updated' })
  @Exempt()
  async productCodeUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    await this.handleEvent(
      context,
      () => this.service.updateProductCode(data.id, data),
      'Error processing product_code_updated event',
    );
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
}
