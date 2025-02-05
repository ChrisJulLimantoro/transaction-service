import { PrismaService } from 'src/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/repositories/base.repository';

@Injectable()
export class UserRepository extends BaseRepository<any> {
  constructor(prisma: PrismaService) {
    const relations = {
      roles: { include: { role: true } },
    };
    super(prisma, 'user', relations, true); // 'user' is the Prisma model name
  }

  async createUser(data: any) {
    return this.create(data); // Using the base create method
  }
}
