import { Module } from '@nestjs/common';
import { VoucherService } from './voucher.service';
import { VoucherController } from './voucher.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { SharedModule } from 'src/shared.module';

@Module({
  imports: [SharedModule],
  providers: [VoucherService, PrismaService],
  controllers: [VoucherController],
})
export class VoucherModule {}
