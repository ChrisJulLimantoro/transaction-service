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
}
