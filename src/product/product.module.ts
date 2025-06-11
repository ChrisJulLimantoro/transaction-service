import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductRepository } from 'src/repositories/product.repository';
import { ProductCodeRepository } from 'src/repositories/product-code.repository';
import { TransactionModule } from 'src/transaction/transaction.module';

@Module({
  imports: [TransactionModule],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository, ProductCodeRepository],
})
export class ProductModule {}
