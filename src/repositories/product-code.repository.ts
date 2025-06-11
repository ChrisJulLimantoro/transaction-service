import { PrismaService } from 'src/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/repositories/base.repository';

@Injectable()
export class ProductCodeRepository extends BaseRepository<any> {
  constructor(prisma: PrismaService) {
    const relations = {
      product: true,
      transaction_products: {
        orderBy: {
          updated_at: 'desc',
        },
        where: {
          deleted_at: null,
        },
      },
    };
    super(prisma, 'productCode', relations, true); // 'role' is the Prisma model name
  }

  async findCode(code: string) {
    return this.prisma.productCode.findFirst({
      include: this.relations,
      where: {
        barcode: code,
        deleted_at: null,
      },
    });
  }
}
