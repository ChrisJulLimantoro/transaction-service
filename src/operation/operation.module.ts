import { Module } from '@nestjs/common';
import { OperationController } from './operation.controller';
import { OperationService } from './operation.service';
import { OperationRepository } from 'src/repositories/operation.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [OperationController],
  providers: [OperationService, OperationRepository, PrismaService],
})
export class OperationModule {}
