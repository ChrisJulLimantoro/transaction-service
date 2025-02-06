import { PrismaService } from 'src/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/repositories/base.repository';

@Injectable()
export class TransactionRepository extends BaseRepository<any> {
  constructor(prisma: PrismaService) {
    const relations = {
      store: true,
      customer: true,
      voucher_used: true,
      transaction_operations: {
        where: {
          deleted_at: null,
        },
        include: {
          operation: true,
        },
      },
      transaction_products: {
        where: {
          deleted_at: null,
        },
        include: {
          product_code: true,
          TransactionReview: true,
        },
      },
      employee: true,
    };
    super(prisma, 'transaction', relations, true); // 'role' is the Prisma model name
  }
}
