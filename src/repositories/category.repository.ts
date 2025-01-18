import { PrismaService } from 'src/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/repositories/base.repository';

@Injectable()
export class CategoryRepository extends BaseRepository<any> {
  constructor(prisma: PrismaService) {
    const relations = {
      types: {
        where: {
          deleted_at: null,
        },
      },
      company: true,
    };
    super(prisma, 'category', relations, true); // 'role' is the Prisma model name
  }
}
