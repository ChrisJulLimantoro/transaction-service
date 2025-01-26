import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ValidationService } from 'src/validation/validation.service';
import { VoucherRequest } from './voucher.model';
import { VoucherValidation } from './voucher.validation';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class VoucherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validationService: ValidationService,
  ) {}

  async create(request: VoucherRequest): Promise<any> {
    // Validate the request data
    console.log(request);
    VoucherValidation.CREATE.parse(request);

    // Create a voucher in the database
    const createdVoucher = await this.prisma.voucher.create({
      data: {
        name: request.voucher_name,
        code: 'codetes',
        discount_amount: new Decimal(request.discount_amount),
        max_discount: new Decimal(request.max_discount),
        min_purchase: new Decimal(request.minimum_purchase),
        poin_price: request.poin_price,
        description: request.description,
        start_date: new Date(request.start_date),
        end_date: new Date(request.end_date),
        is_active: request.is_active,
        store_id: request.store_id,
      },
      include: {
        store: true,
      },
    });

    return createdVoucher;
  }
}
