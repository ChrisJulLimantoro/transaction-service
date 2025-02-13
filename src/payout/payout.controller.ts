import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Describe } from 'src/decorator/describe.decorator';
import { PayoutService } from './payout.service';

@Controller('payout')
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  @MessagePattern({ cmd: 'post:payout_request' })
  @Describe({
    description: 'Request a Payout',
    fe: ['marketplace/payout_request:add'],
  })
  async requestPayout(@Payload() data: any): Promise<any> {
    try {
      const result = await this.payoutService.createPayout(data.body);
      return {
        success: true,
        message: 'Payout request submitted successfully!',
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

  @MessagePattern({ cmd: 'get:payout_requests' })
  @Describe({
    description: 'Get All Payout Requests ordered by created_at',
    fe: ['marketplace/payout_request:open'],
  })
  async getAllPayoutRequests(): Promise<any> {
    try {
      const result = await this.payoutService.getAllPayoutRequests();
      return {
        success: true,
        message: 'Success retrieving all payout requests!',
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
  @MessagePattern({ cmd: 'patch:payout_requests/*' })
  @Describe({
    description: 'Update Payout Request (Approve/Reject & Upload Proof)',
    fe: ['marketplace/payout_request:edit'],
  })
  async updatePayoutRequest(@Payload() data: any): Promise<any> {
    try {
      const { id } = data.params;
      const { proofUrl } = data.body;

      const result = await this.payoutService.saveProof(id, proofUrl);

      return {
        success: true,
        message: 'Payout request updated successfully!',
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

  @MessagePattern({ cmd: 'get:payout_request/*/store' })
  @Describe({
    description: 'Get Payout Requests By Store',
    fe: ['marketplace/payout_request:open'],
  })
  async getPayoutsByStore(@Payload() data: any): Promise<any> {
    try {
      const result = await this.payoutService.getPayoutsByStore(
        data.params.store_id,
      );
      return {
        success: true,
        message: 'Success retrieving payout requests!',
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

  @MessagePattern({ cmd: 'get:payout_request/*/id' })
  @Describe({
    description: 'Get Payout Request By ID',
    fe: ['marketplace/payout_request:detail'],
  })
  async getPayoutById(@Payload() data: any): Promise<any> {
    try {
      const result = await this.payoutService.getPayoutById(data.params.id);
      return {
        success: true,
        message: 'Success retrieving payout request details!',
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
