import { Module } from '@nestjs/common';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { SharedModule } from 'src/shared.module';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [SharedModule],
  controllers: [ReviewController],
  providers: [ReviewService, PrismaService],
})
export class ReviewModule {}
