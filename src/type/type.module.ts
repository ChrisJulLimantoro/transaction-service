import { Module } from '@nestjs/common';
import { TypeController } from './type.controller';
import { TypeService } from './type.service';
import { TypeRepository } from 'src/repositories/type.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [TypeController],
  providers: [TypeService, TypeRepository, PrismaService],
})
export class TypeModule {}
