import { Module } from '@nestjs/common';
import { VoucherService } from './voucher.service';
import { VoucherController } from './voucher.controller';
import { SharedModule } from 'src/shared.module';

@Module({
  imports: [SharedModule],
  providers: [VoucherService],
  controllers: [VoucherController],
})
export class VoucherModule {}
