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
}
