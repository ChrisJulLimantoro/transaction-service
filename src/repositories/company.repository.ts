import { PrismaService } from 'src/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/repositories/base.repository';

@Injectable()
export class CompanyRepository extends BaseRepository<any> {
  constructor(prisma: PrismaService) {
    const relations = {
      stores: {
        where: {
          deleted_at: null,
        },
      },
      categories: {
        where: {
          deleted_at: null,
        },
      },
    };
    super(prisma, 'company', relations, true); // 'role' is the Prisma model name
  }
}
