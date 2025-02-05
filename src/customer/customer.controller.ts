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

@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}
  @EventPattern({ cmd: 'user_register' })
  @Exempt()
  async registerCustomer(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('Creating user', data.id);
    const response = await this.customerService.register(data);
    if (response) {
      context.getChannelRef().ack(context.getMessage());
    }
    return response;
  }

  @EventPattern({ cmd: 'user_verified' })
  @Exempt()
  async verifyCustomer(@Payload() data: any, @Ctx() context: RmqContext) {
    const response = await this.customerService.verifyUser(data);
    if (response) {
      context.getChannelRef().ack(context.getMessage());
    }
    return response;
  }

  @EventPattern({ cmd: 'update_profile' })
  @Exempt()
  async updateProfile(@Payload() data: any, @Ctx() context: RmqContext) {
    const response = await this.customerService.updateProfile(data);
    if (response) {
      context.getChannelRef().ack(context.getMessage());
    }
    return response;
  }

  @EventPattern({ cmd: 'soft_delete' })
  @Exempt()
  async deleteUser(@Payload() data: any, @Ctx() context: RmqContext) {
    const response = await this.customerService.deleteUser(data.id);
    if (response) {
      context.getChannelRef().ack(context.getMessage());
    }
    return response;
  }

  @EventPattern({ cmd: 'add_device_token' })
  @Exempt()
  async addDeviceToken(
    @Payload() data: { userId: string; deviceToken: string },
    @Ctx() context: RmqContext,
  ) {
    const response = await this.customerService.addDeviceToken(
      data.userId,
      data.deviceToken,
    );
    if (response) {
      context.getChannelRef().ack(context.getMessage());
    }
    return response;
  }

  @MessagePattern({ cmd: 'get:customer' })
  @Exempt()
  async getCustomer(@Payload() data: any) {
    const response = await this.customerService.findAll(data);
    return response;
  }
}
