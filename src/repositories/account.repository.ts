import { PrismaService } from 'src/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/repositories/base.repository';

@Injectable()
export class AccountRepository extends BaseRepository<any> {
  constructor(prisma: PrismaService) {
    const relations = {
        store: true,
        company: true,
    };
    super(prisma, 'account', relations, true); // 'role' is the Prisma model name
  }
}