import { Controller, Inject } from '@nestjs/common';
import { VoucherService } from './voucher.service';
import { ClientProxy, MessagePattern, Payload } from '@nestjs/microservices';
import { Describe } from 'src/decorator/describe.decorator';

@Controller('voucher')
export class VoucherController {
  constructor(
    private readonly voucherService: VoucherService,
    @Inject('MARKETPLACE') private readonly marketplaceClient: ClientProxy,
  ) {}

  @MessagePattern({ cmd: 'post:voucher' })
  @Describe('Create Voucher')
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
  @Describe('Update Voucher')
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
  @Describe('Soft Delete Voucher')
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
}
