import { Controller } from '@nestjs/common';
import { AccountService } from './account.service';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { Exempt } from 'src/decorator/exempt.decorator';

@Controller()
export class AccountController {
  constructor(private readonly service: AccountService) {}

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
  
  @EventPattern({ cmd: 'account_created' })
  @Exempt()
  async accountCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    await this.handleEvent(
      context,
      () => this.service.create(data),
      'Error processing account_created event',
    );
    console.log('account created: ', data);
  }

  @EventPattern({ cmd: 'account_updated' })
  @Exempt()
  async accountUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    await this.handleEvent(
      context,
      () => this.service.update(data.id, data),
      'Error processing account_updated event',
    );
    console.log('account updated: ', data);
  }

  @EventPattern({ cmd: 'account_deleted' })
  @Exempt()
  async accountDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    await this.handleEvent(
      context,
      () => this.service.delete(data),
      'Error processing account_deleted event',
    );
    console.log('account deleted received: ', data);
  }
}
