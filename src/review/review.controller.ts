import { Controller, Inject } from '@nestjs/common';
import {
  ClientProxy,
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { Exempt } from 'src/decorator/exempt.decorator';
import { ReviewService } from './review.service';
import { Describe } from 'src/decorator/describe.decorator';
import { RmqHelper } from 'src/helper/rmq.helper';

@Controller('review')
export class ReviewController {
  constructor(
    private readonly reviewService: ReviewService,
    @Inject('MARKETPLACE')
    private readonly marketplaceClient: ClientProxy,
  ) {}

  @MessagePattern({ cmd: 'put:review/*' })
  @Describe({
    description: 'comment on a review',
    fe: ['transaction/sales:edit', 'transaction/sales:detail'],
  })
  async replyReview(@Payload() data: any) {
    const response = await this.reviewService.replyReview(
      data.params.id,
      data.body,
    );
    RmqHelper.publishEvent('review.admin', response);
    return {
      data: response,
      message: 'Review added successfully!',
      success: true,
      statusCode: 201,
    };
  }
  @EventPattern('review.created')
  @Exempt()
  async giveReview(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('Captured Review Created Event', data);
    await RmqHelper.handleMessageProcessing(
      context,
      async () => {
        const response = await this.reviewService.giveReview(data);
        return {
          data: response,
          message: 'Review added successfully!',
          success: true,
          statusCode: 201,
        };
      },
      {
        queueName: 'review.created',
        useDLQ: true,
        dlqRoutingKey: 'dlq.review.created',
      },
    )();
  }

  @EventPattern('review.updated')
  @Exempt()
  async handleReplyReview(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('Captured Review Updated Event', data);
    await RmqHelper.handleMessageProcessing(
      context,
      async () => {
        await this.reviewService.editReview(data);
      },
      {
        queueName: 'review.updated',
        useDLQ: true,
        dlqRoutingKey: 'dlq.review.updated',
      },
    )();
  }
}
