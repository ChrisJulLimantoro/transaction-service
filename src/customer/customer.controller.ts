import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { Exempt } from 'src/decorator/exempt.decorator';
import { CustomerService } from './customer.service';

@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}
  @EventPattern({ cmd: 'user_register' })
  @Exempt()
  async registerCustomer(@Payload() data: any) {
    const response = await this.customerService.register(data);
    return response;
  }

  @EventPattern({ cmd: 'user_verified' })
  @Exempt()
  async verifyCustomer(@Payload() data: any) {
    const response = await this.customerService.verifyUser(data);
    return response;
  }

  @EventPattern({ cmd: 'update_profile' })
  @Exempt()
  async updateProfile(@Payload() data: any) {
    const response = await this.customerService.updateProfile(data);
    return response;
  }

  @EventPattern({ cmd: 'soft_delete' })
  @Exempt()
  async deleteUser(@Payload() data: any) {
    const response = await this.customerService.deleteUser(data.id);
    return response;
  }

  @EventPattern({ cmd: 'add_device_token' })
  @Exempt()
  async addDeviceToken(
    @Payload() data: { userId: string; deviceToken: string },
  ) {
    const response = await this.customerService.addDeviceToken(
      data.userId,
      data.deviceToken,
    );
    return response;
  }
}
