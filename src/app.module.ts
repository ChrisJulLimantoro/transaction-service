import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { CategoryModule } from './category/category.module';
import { TypeModule } from './type/type.module';
import { ProductModule } from './product/product.module';
import { PriceModule } from './price/price.module';
import { CompanyModule } from './company/company.module';
import { StoreModule } from './store/store.module';
import { DiscoveryModule } from '@nestjs/core';
import { ValidationModule } from './validation/validation.module';
import { PrismaModule } from './prisma/prisma.module';
import { MessagePatternDiscoveryService } from './discovery/message-pattern-discovery.service';
import { OperationModule } from './operation/operation.module';
import { TransactionModule } from './transaction/transaction.module';
import { CustomerModule } from './customer/customer.module';
import { VoucherModule } from './voucher/voucher.module';
import { UserModule } from './user/user.module';
import { ReviewModule } from './review/review.module';
import { BankModule } from './bank/bank.module';
import { AccountModule } from './account/account.module';

@Module({
  imports: [
    DiscoveryModule,
    ValidationModule.forRoot(),
    PrismaModule,
    CategoryModule,
    TypeModule,
    ProductModule,
    PriceModule,
    CompanyModule,
    StoreModule,
    OperationModule,
    TransactionModule,
    CustomerModule,
    VoucherModule,
    UserModule,
    ReviewModule,
    BankModule,
    AccountModule,
  ],
  controllers: [AppController],
  providers: [MessagePatternDiscoveryService],
})
export class AppModule {}
