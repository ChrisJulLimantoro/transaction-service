import { PrismaService } from 'src/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/repositories/base.repository';

@Injectable()
export class ProductCodeRepository extends BaseRepository<any> {
  constructor(prisma: PrismaService) {
    const relations = {
      product: true,
    };
    super(prisma, 'productCode', relations, true); // 'role' is the Prisma model name
  }
}
