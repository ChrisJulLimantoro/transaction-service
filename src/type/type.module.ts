import { Module } from '@nestjs/common';
import { TypeController } from './type.controller';
import { TypeService } from './type.service';
import { TypeRepository } from 'src/repositories/type.repository';

@Module({
  controllers: [TypeController],
  providers: [TypeService, TypeRepository],
})
export class TypeModule {}
