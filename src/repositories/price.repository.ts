import { PrismaService } from 'src/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/repositories/base.repository';

@Injectable()
export class PriceRepository extends BaseRepository<any> {
  constructor(prisma: PrismaService) {
    const relations = {
      type: true,
    };
    super(prisma, 'price', relations, true); // 'role' is the Prisma model name
  }
}
