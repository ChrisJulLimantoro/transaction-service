import { PrismaService } from 'src/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/repositories/base.repository';

@Injectable()
export class TypeRepository extends BaseRepository<any> {
  constructor(prisma: PrismaService) {
    const relations = {
      products: {
        where: {
          deleted_at: null,
        },
      },
      prices: {
        where: {
          deleted_at: null,
        },
      },
      category: true,
    };
    super(prisma, 'type', relations, true); // 'role' is the Prisma model name
  }
}
