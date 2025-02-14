import { PrismaService } from 'src/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/repositories/base.repository';

@Injectable()
export class OperationRepository extends BaseRepository<any> {
  constructor(prisma: PrismaService) {
    const relations = {
      store: true,
      transaction_operations: {
        where: {
          deleted_at: null,
        },
      },
      account: true,
    };
    super(prisma, 'operation', relations, true); // 'role' is the Prisma model name
  }
}
