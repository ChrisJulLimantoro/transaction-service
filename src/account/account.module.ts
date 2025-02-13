import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { AccountRepository } from 'src/repositories/account.repository';

@Module({
  controllers: [AccountController],
  providers: [AccountService, AccountRepository, PrismaService],
})
export class AccountModule {}
