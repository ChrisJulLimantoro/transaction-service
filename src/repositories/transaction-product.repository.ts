import { PrismaService } from 'src/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/repositories/base.repository';

@Injectable()
export class TransactionProductRepository extends BaseRepository<any> {
  constructor(prisma: PrismaService) {
    const relations = {
      transaction: {
        include: {
          store: true,
        },
      },
      product_code: true,
    };
    super(prisma, 'transactionProduct', relations, true); // 'role' is the Prisma model name
  }
}
