import { Module } from '@nestjs/common';
import { BankController } from './bank.controller';
import { BankService } from './bank.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [BankController],
  providers: [BankService, PrismaService],
})
export class BankModule {}
