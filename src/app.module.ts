import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategoryModule } from './category/category.module';
import { TypeModule } from './type/type.module';
import { ProductModule } from './product/product.module';
import { PriceModule } from './price/price.module';
import { CompanyModule } from './company/company.module';
import { StoreModule } from './store/store.module';
import { DiscoveryModule } from '@nestjs/core';
import { ValidationModule } from './validation/validation.module';
import { PrismaModule } from './prisma/prisma.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
