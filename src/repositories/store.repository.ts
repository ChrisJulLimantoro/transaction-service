import { PrismaService } from 'src/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/repositories/base.repository';

@Injectable()
export class StoreRepository extends BaseRepository<any> {
  constructor(prisma: PrismaService) {
    const relations = {
      company: true,
      products: {
        where: {
          deleted_at: null,
        },
      },
    };
    super(prisma, 'store', relations, true); // 'role' is the Prisma model name
  }
}
