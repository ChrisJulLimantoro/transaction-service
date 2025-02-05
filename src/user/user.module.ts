import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from '../repositories/user.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SharedModule } from 'src/shared.module';

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [UserController],
  providers: [UserService, UserRepository],
})
export class UserModule {}
