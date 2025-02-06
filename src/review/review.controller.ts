import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { Exempt } from 'src/decorator/exempt.decorator';
import { ReviewService } from './review.service';

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}
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
