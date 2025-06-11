import { Controller } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { Exempt } from 'src/decorator/exempt.decorator';
import { CustomerService } from './customer.service';
import { Describe } from 'src/decorator/describe.decorator';
import { RmqHelper } from 'src/helper/rmq.helper';

@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}
  @EventPattern('customer.register')
  @Exempt()
  async registerCustomer(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('Captured Customer Created Event', data);
    await RmqHelper.handleMessageProcessing(
      context,
      async () => {
        await this.customerService.register(data);
      },
      {
        queueName: 'customer.register',
        useDLQ: true,
        dlqRoutingKey: 'dlq.customer.register',
      },
    )();
  }

  @EventPattern('customer.verified')
  @Exempt()
  async verifyCustomer(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('Captured Customer Verified Event', data);
    await RmqHelper.handleMessageProcessing(
      context,
      async () => {
        const response = await this.customerService.verifyUser(data);
        return response;
      },
      {
        queueName: 'customer.verified',
        useDLQ: true,
        dlqRoutingKey: 'dlq.customer.verified',
      },
    )();
  }

  @EventPattern('customer.update_profile')
  @Exempt()
  async updateProfile(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('Captured Customer Update Event', data);
    await RmqHelper.handleMessageProcessing(
      context,
      async () => {
        const response = await this.customerService.updateProfile(data);
        return response;
      },
      {
        queueName: 'customer.update_profile',
        useDLQ: true,
        dlqRoutingKey: 'dlq.customer.update_profile',
      },
    )();
  }

  @EventPattern('customer.delete')
  @Exempt()
  async deleteUser(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('Captured Customer Delete Event', data);
    await RmqHelper.handleMessageProcessing(
      context,
      async () => {
        const response = await this.customerService.deleteUser(data.id);
        return response;
      },
      {
        queueName: 'customer.delete',
        useDLQ: true,
        dlqRoutingKey: 'dlq.customer.delete',
      },
    )();
  }

  @EventPattern('customer.device_token')
  @Exempt()
  async addDeviceToken(
    @Payload() data: { userId: string; deviceToken: string },
    @Ctx() context: RmqContext,
  ) {
    console.log('Captured Customer Device Token Event', data);
    await RmqHelper.handleMessageProcessing(
      context,
      async () => {
        const response = await this.customerService.addDeviceToken(
          data.userId,
          data.deviceToken,
        );
        return response;
      },
      {
        queueName: 'customer.device_token',
        useDLQ: true,
        dlqRoutingKey: 'dlq.customer.device_token',
      },
    )();
  }

  @MessagePattern({ cmd: 'get:customer' })
  @Describe({
    description: 'Get all customer registered',
    fe: [
      'transaction/sales:add',
      'transaction/sales:edit',
      'transaction/sales:detail',
      'customer:all',
    ],
  })
  async getCustomer(@Payload() data: any) {
    const response = await this.customerService.findAll(data);
    return response;
  }

  @MessagePattern({ cmd: 'get:customer/*' })
  @Describe({
    description: 'Get customer by id',
    fe: [
      'transaction/sales:add',
      'transaction/sales:edit',
      'transaction/sales:detail',
    ],
  })
  async getCustomerById(@Payload() data: any) {
    const response = await this.customerService.findById(data.params.id);
    return response;
  }

  @MessagePattern({ cmd: 'get:customer-email/*' })
  @Describe({
    description: 'Get customer by email',
    fe: [
      'transaction/sales:add',
      'transaction/sales:edit',
      'transaction/sales:detail',
    ],
  })
  async getCustomerByEmail(@Payload() data: any) {
    const response = await this.customerService.findByEmail(data.params.id);
    return response;
  }
}
