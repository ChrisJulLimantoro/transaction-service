import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { TransactionOperationRepository } from 'src/repositories/transaction-operation.repository';
import { TransactionProductRepository } from 'src/repositories/transaction-product.repository';
import { SharedModule } from 'src/shared.module';
import { ProductCodeRepository } from 'src/repositories/product-code.repository';
import { PdfService } from './pdf.service';

@Module({
  providers: [
    TransactionService,
    TransactionRepository,
    TransactionOperationRepository,
    TransactionProductRepository,
    ProductCodeRepository,
    PdfService,
  ],
  controllers: [TransactionController],
  imports: [SharedModule],
  exports: [TransactionService],
})
export class TransactionModule {}
