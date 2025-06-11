import { Module } from '@nestjs/common';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { SharedModule } from 'src/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [ReviewController],
  providers: [ReviewService],
})
export class ReviewModule {}
