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
      const result = await this.voucherService.getByStore(data.params.store_id);
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
      this.marketplaceClient.emit(
        { module: 'voucher', action: 'create' },
        result,
      );
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

  @MessagePattern({ cmd: 'put:voucher/*' })
  @Describe({ description: 'Update Voucher', fe: ['marketplace/voucher:edit'] })
  async update(@Payload() data: any): Promise<any> {
    console.log(data);
    const param = data.params;
    const body = data.body;
    try {
      const result = await this.voucherService.update(param.id, body);
      this.marketplaceClient.emit(
        { module: 'voucher', action: 'update' },
        result,
      );
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

  @MessagePattern({ cmd: 'delete:voucher/*' })
  @Describe({
    description: 'Soft Delete Voucher',
    fe: ['marketplace/voucher:delete'],
  })
  async delete(@Payload() data: any): Promise<any> {
    const param = data.params;
    try {
      const result = await this.voucherService.softDelete(param.id);
      this.marketplaceClient.emit(
        { module: 'voucher', action: 'delete' },
        result,
      );
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

  @EventPattern({ cmd: 'purchase_voucher' })
  @Exempt()
  async deleteUser(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log(data);
    const response = await this.voucherService.purchaseVoucher(data);
    if (response) {
      context.getChannelRef().ack(context.getMessage());
    }
    return response;
    // const response = await this.customerService.deleteUser(data.id);
    // return response;
  }
}
