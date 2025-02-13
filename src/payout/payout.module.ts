import { Module } from '@nestjs/common';
import { PayoutController } from './payout.controller';
import { PayoutService } from './payout.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PayoutController],
  providers: [PayoutService, PrismaService],
})
export class PayoutModule {}
