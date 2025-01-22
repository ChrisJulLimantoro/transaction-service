import { PrismaService } from 'src/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/repositories/base.repository';

@Injectable()
export class TransactionOperationRepository extends BaseRepository<any> {
  constructor(prisma: PrismaService) {
    const relations = {
      transaction: true,
      operation: true,
    };
    super(prisma, 'transactionOperation', relations, true);
  }
}
