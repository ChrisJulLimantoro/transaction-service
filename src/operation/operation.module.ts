import { Module } from '@nestjs/common';
import { OperationController } from './operation.controller';
import { OperationService } from './operation.service';
import { OperationRepository } from 'src/repositories/operation.repository';

@Module({
  controllers: [OperationController],
  providers: [OperationService, OperationRepository],
})
export class OperationModule {}
