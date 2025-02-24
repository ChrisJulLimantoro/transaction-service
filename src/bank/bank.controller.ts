import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Describe } from 'src/decorator/describe.decorator';
import { BankService } from './bank.service';

@Controller('bank_account')
export class BankController {
  constructor(private readonly bankAccountService: BankService) {}

  @MessagePattern({ cmd: 'get:bank_account/*/store' })
  @Describe({
    description: 'Get Bank Accounts By Store',
    fe: ['marketplace/bank_account:open'],
  })
  async getByStore(@Payload() data: any): Promise<any> {
    try {
      console.log(data);
      const result = await this.bankAccountService.getByStore(
        data.body.auth.store_id,
      );
      console.log(result);
      return {
        success: true,
        message: 'Success Retrieve Bank Accounts!',
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

  @MessagePattern({ cmd: 'get:bank_account/*/id' })
  @Describe({
    description: 'Get Bank Account By ID',
    fe: ['marketplace/bank_account:edit', 'marketplace/bank_account:detail'],
  })
  async getById(@Payload() data: any): Promise<any> {
    try {
      const result = await this.bankAccountService.getById(data.params.id);
      return {
        success: true,
        message: 'Success Retrieve Bank Account!',
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

  @MessagePattern({ cmd: 'post:bank_account' })
  @Describe({
    description: 'Create Bank Account',
    fe: ['marketplace/bank_account:add'],
  })
  async create(@Payload() data: any): Promise<any> {
    try {
      console.log(data.body);
      const result = await this.bankAccountService.create(data.body);
      return {
        success: true,
        message: 'Success Create Bank Account!',
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

  @MessagePattern({ cmd: 'put:bank_account/*' })
  @Describe({
    description: 'Update Bank Account',
    fe: ['marketplace/bank_account:edit'],
  })
  async update(@Payload() data: any): Promise<any> {
    const param = data.params;
    const body = data.body;
    try {
      const result = await this.bankAccountService.update(param.id, body);
      return {
        success: true,
        message: 'Success Update Bank Account!',
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

  @MessagePattern({ cmd: 'delete:bank_account/*' })
  @Describe({
    description: 'Soft Delete Bank Account',
    fe: ['marketplace/bank_account:delete'],
  })
  async delete(@Payload() data: any): Promise<any> {
    const param = data.params;
    try {
      const result = await this.bankAccountService.softDelete(param.id);
      return {
        success: true,
        message: 'Success Delete Bank Account!',
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
