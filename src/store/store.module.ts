import { Module } from '@nestjs/common';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { StoreRepository } from 'src/repositories/store.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [StoreController],
  providers: [StoreService, StoreRepository, PrismaService],
})
export class StoreModule {}
