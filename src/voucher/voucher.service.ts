import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ValidationService } from 'src/validation/validation.service';
import { VoucherRequest } from './voucher.model';
import { VoucherValidation } from './voucher.validation';
import { Decimal } from '@prisma/client/runtime/library';
import { RpcException } from '@nestjs/microservices';

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

  async update(voucher_id: string, request: VoucherRequest): Promise<any> {
    VoucherValidation.CREATE.parse(request);
    const voucher = await this.prisma.voucher.findUnique({
      where: { id: voucher_id },
      include: { store: true },
    });

    if (!voucher) {
      throw new HttpException(
        `Voucher with ID ${voucher_id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const updatedVoucher = await this.prisma.voucher.update({
      where: { id: voucher_id },
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

    return updatedVoucher;
  }

  async softDelete(voucher_id: string): Promise<any> {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id: voucher_id },
      include: { store: true },
    });

    if (!voucher) {
      throw new HttpException(
        `Voucher with ID ${voucher_id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (voucher.deleted_at) {
      throw new HttpException(
        `Voucher with ID ${voucher_id} is already deleted`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const deletedVoucher = await this.prisma.voucher.update({
      where: { id: voucher_id },
      data: {
        deleted_at: new Date(), // Mark as deleted
      },
      include: {
        store: true,
      },
    });

    return deletedVoucher;
  }
}
