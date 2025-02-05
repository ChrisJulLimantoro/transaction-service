import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransactionOperationRepository } from 'src/repositories/transaction-operation.repository';
import { TransactionProductRepository } from 'src/repositories/transaction-product.repository';
import { SharedModule } from 'src/shared.module';

@Module({
  providers: [
    TransactionService,
    TransactionRepository,
    PrismaService,
    TransactionOperationRepository,
    TransactionProductRepository,
  ],
  controllers: [TransactionController],
  imports: [SharedModule],
})
export class TransactionModule {}
