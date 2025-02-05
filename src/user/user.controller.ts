import {
  Controller,
  Get,
  Post,
  Body,
  Res,
  Delete,
  Param,
  Inject,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserRequest } from './dto/create-user-request.dto';
import {
  ClientProxy,
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { Exempt } from 'src/decorator/exempt.decorator';
import { Describe } from 'src/decorator/describe.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  private async handleEvent(
    context: RmqContext,
    callback: () => Promise<{ success: boolean }>,
    errorMessage: string,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const response = await callback();
      if (response.success) {
        channel.ack(originalMsg);
      }
    } catch (error) {
      console.error(errorMessage, error.stack);
      channel.nack(originalMsg);
    }
  }

  private sanitizeData(data: any): any {
    return { password: data.password };
  }

  @EventPattern({ cmd: 'employee_created' })
  @Exempt()
  async employeeCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    await this.handleEvent(
      context,
      () => this.userService.createUser(data),
      'Error processing employee_created event',
    );
  }

  @EventPattern({ cmd: 'employee_deleted' })
  @Exempt()
  async employeeDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    await this.handleEvent(
      context,
      () => this.userService.deleteUser(data),
      'Error processing employee_deleted event',
    );
  }

  @EventPattern({ cmd: 'owner_created' })
  @Exempt()
  async ownerCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    await this.handleEvent(
      context,
      () => this.userService.createUser(data),
      'Error processing owner_created event',
    );
  }

  @EventPattern({ cmd: 'owner_deleted' })
  @Exempt()
  async ownerDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    await this.handleEvent(
      context,
      () => this.userService.deleteUser(data),
      'Error processing owner_deleted event',
    );
  }

  @EventPattern({ cmd: 'owner_updated' })
  @Exempt()
  async ownerUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    const sanitizedData = this.sanitizeData(data);
    await this.handleEvent(
      context,
      () => this.userService.updateUser(data.id, sanitizedData),
      'Error processing owner_updated event',
    );
  }

  @EventPattern({ cmd: 'employee_updated' })
  @Exempt()
  async employeeUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    const sanitizedData = this.sanitizeData(data);
    await this.handleEvent(
      context,
      () => this.userService.updateUser(data.id, sanitizedData),
      'Error processing employee_updated event',
    );
  }
}
