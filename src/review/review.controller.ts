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
    this.marketplaceClient.emit(
      { module: 'review', action: 'replyByAdmin' },
      response,
    );
    return {
      data: response,
      message: 'Review added successfully!',
      success: true,
      statusCode: 201,
    };
  }
  @EventPattern({ cmd: 'give_review' })
  @Exempt()
  async giveReview(@Payload() data: any, @Ctx() context: RmqContext) {
    const response = await this.reviewService.giveReview(data);
    if (response) {
      context.getChannelRef().ack(context.getMessage());
    }
    return {
      data: response,
      message: 'Review added successfully!',
      success: true,
      statusCode: 201,
    };
  }
}
