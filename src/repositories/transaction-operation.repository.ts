import { PrismaService } from 'src/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/repositories/base.repository';

@Injectable()
export class TransactionOperationRepository extends BaseRepository<any> {
  constructor(prisma: PrismaService) {
    const relations = {
      transaction: {
        include: {
          store: true,
        },
      },
      operation: {
        include: {
          account: true
        }
      },
    };
    super(prisma, 'transactionOperation', relations, true);
  }
}
