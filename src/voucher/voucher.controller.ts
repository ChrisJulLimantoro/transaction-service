import { Controller, Inject } from '@nestjs/common';
import { VoucherService } from './voucher.service';
import {
  ClientProxy,
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { Describe } from 'src/decorator/describe.decorator';
import { Exempt } from 'src/decorator/exempt.decorator';
import { RmqHelper } from 'src/helper/rmq.helper';

@Controller('voucher')
export class VoucherController {
  constructor(
    private readonly voucherService: VoucherService,
    @Inject('MARKETPLACE') private readonly marketplaceClient: ClientProxy,
  ) {}

  @MessagePattern({ cmd: 'get:voucher/*/store' })
  @Describe({
    description: 'Get Vouchers By Store',
    fe: ['marketplace/voucher:open'],
  })
  async getByStore(@Payload() data: any): Promise<any> {
    try {
      const result = await this.voucherService.getByStore(
        data.body.auth.store_id,
      );
      return {
        success: true,
        message: 'Success Retrieve Vouchers!',
        data: result,
        statusCode: 200,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error.message],
        statusCode: 500,
      };
    }
  }
  @MessagePattern({ cmd: 'get:voucher/*/id' })
  @Describe({
    description: 'Get Voucher By ID',
    fe: ['marketplace/voucher:edit', 'marketplace/voucher:detail'],
  })
  async getById(@Payload() data: any): Promise<any> {
    try {
      const result = await this.voucherService.getById(data.params.id);
      return {
        success: true,
        message: 'Success Retrieve Voucher!',
        data: result,
        statusCode: 200,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error.message],
        statusCode: 500,
      };
    }
  }

  @MessagePattern({ cmd: 'post:voucher' })
  @Describe({ description: 'Create Voucher', fe: ['marketplace/voucher:add'] })
  async create(@Payload() data: any): Promise<any> {
    try {
      const result = await this.voucherService.create(data.body);
      // this.marketplaceClient.emit(
      //   { module: 'voucher', action: 'create' },
      //   result,
      // );
      RmqHelper.publishEvent('voucher.created', result);
      return {
        success: true,
        message: 'Success Create Voucher!',
        data: result,
        statusCode: 200,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error.message],
        statusCode: 500,
      };
    }
  }
  @EventPattern('voucher.created')
  @Exempt()
  async createReplica(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('Captured Voucher Create Event', data);
    await RmqHelper.handleMessageProcessing(
      context,
      async () => {
        await this.voucherService.createReplica(data);
      },
      {
        queueName: 'voucher.created',
        useDLQ: true,
        dlqRoutingKey: 'dlq.voucher.created',
      },
    )();
  }

  @MessagePattern({ cmd: 'put:voucher/*' })
  @Describe({ description: 'Update Voucher', fe: ['marketplace/voucher:edit'] })
  async update(@Payload() data: any): Promise<any> {
    console.log(data);
    const param = data.params;
    const body = data.body;
    try {
      const result = await this.voucherService.update(param.id, body);
      // this.marketplaceClient.emit(
      //   { module: 'voucher', action: 'update' },
      //   result,
      // );
      RmqHelper.publishEvent('voucher.updated', result);
      return {
        success: true,
        message: 'Success Update Voucher!',
        data: result,
        statusCode: 200,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error.message],
        statusCode: 500,
      };
    }
  }

  @EventPattern('voucher.updated')
  @Exempt()
  async updateReplica(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('Captured Voucher Update Event', data);
    await RmqHelper.handleMessageProcessing(
      context,
      async () => {
        await this.voucherService.updateReplica(data.id, data);
      },
      {
        queueName: 'voucher.updated',
        useDLQ: true,
        dlqRoutingKey: 'dlq.voucher.updated',
      },
    )();
  }

  @MessagePattern({ cmd: 'delete:voucher/*' })
  @Describe({
    description: 'Soft Delete Voucher',
    fe: ['marketplace/voucher:delete'],
  })
  async delete(@Payload() data: any): Promise<any> {
    const param = data.params;
    try {
      const result = await this.voucherService.softDelete(param.id);
      // this.marketplaceClient.emit(
      //   { module: 'voucher', action: 'delete' },
      //   result,
      // );
      RmqHelper.publishEvent('voucher.deleted', result);
      return {
        success: true,
        message: 'Success Delete Voucher!',
        data: result,
        statusCode: 200,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [error.message],
        statusCode: 500,
      };
    }
  }

  @EventPattern('voucher.deleted')
  @Exempt()
  async deleteReplica(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('Captured Voucher Deleted Event', data);
    await RmqHelper.handleMessageProcessing(
      context,
      async () => {
        await this.voucherService.deleteReplica(data.id);
      },
      {
        queueName: 'voucher.deleted',
        useDLQ: true,
        dlqRoutingKey: 'dlq.voucher.deleted',
      },
    )();
  }

  @EventPattern('voucher.purchased')
  @Exempt()
  async deleteUser(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      async () => {
        console.log(data);
        const response = await this.voucherService.purchaseVoucher(data);
        return response;
      },
      {
        queueName: 'voucher_purchased',
        useDLQ: true,
        dlqRoutingKey: 'dlq.voucher_purchased',
      },
    )();

    // const response = await this.customerService.deleteUser(data.id);
    // return response;
  }
}
