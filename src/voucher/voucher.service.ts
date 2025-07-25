import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ValidationService } from 'src/validation/validation.service';
import { VoucherRequest } from './voucher.model';
import { VoucherValidation } from './voucher.validation';
import { Decimal } from '@prisma/client/runtime/library';
import { RpcException } from '@nestjs/microservices';
import { randomInt } from 'crypto';

@Injectable()
export class VoucherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validationService: ValidationService,
  ) {}

  async getByStore(store_id: string): Promise<any> {
    const vouchers = await this.prisma.voucher.findMany({
      where: {
        store_id: store_id,
        deleted_at: null,
      },
      include: {
        store: true,
      },
    });

    return vouchers;
  }
  async create(request: VoucherRequest): Promise<any> {
    // Validate the request data
    console.log(request);
    VoucherValidation.CREATE.parse(request);

    const randomNumber = randomInt(100000, 999999); // 6 digit angka acak
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const storeCode = request.store_id
      ? `STR-${request.store_id.slice(-3)}`
      : 'STR-000'; // Ambil 3 karakter terakhir dari store_id

    const uniqueCode = `VOUCH-${randomNumber}-${datePart}-${storeCode}`;

    // Create a voucher in the database
    const createdVoucher = await this.prisma.voucher.create({
      data: {
        name: request.voucher_name,
        code: uniqueCode,
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

  async getById(voucher_id: string): Promise<any> {
    // Cari voucher berdasarkan ID
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

    // Hitung total voucher yang sudah dibeli dari VoucherOwned
    const totalSold = await this.prisma.voucherOwned.count({
      where: { voucher_id },
    });

    // Return data dengan tambahan totalSold
    return {
      ...voucher,
      totalSold, // Tambahkan jumlah voucher yang sudah dibeli
    };
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

  async purchaseVoucher(data: any): Promise<any> {
    const purchased = await this.prisma.voucherOwned.create({
      data: {
        id: data.id,
        customer_id: data.user_id,
        voucher_id: data.voucher_id,
        purchesed_at: new Date(data.purchased_at),
        is_used: data.is_used,
      },
    });
    return purchased;
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

  //handle replica
  async createReplica(data: any): Promise<any> {
    return this.prisma.voucher.create({
      data: {
        id: data.id,
        name: data.name,
        code: data.code,
        discount_amount: new Decimal(data.discount_amount),
        max_discount: new Decimal(data.max_discount),
        min_purchase: new Decimal(data.min_purchase),
        poin_price: data.poin_price,
        description: data.description,
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
        is_active: data.is_active,
        store_id: data.store_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    });
  }
  async updateReplica(id: string, data: any): Promise<any> {
    return this.prisma.voucher.update({
      where: { id },
      data: {
        name: data.name,
        discount_amount: new Decimal(data.discount_amount),
        max_discount: new Decimal(data.max_discount),
        min_purchase: new Decimal(data.min_purchase),
        poin_price: data.poin_price,
        description: data.description,
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
        is_active: data.is_active,
        store_id: data.store_id,
        updated_at: new Date(),
      },
    });
  }

  async deleteReplica(id: string): Promise<any> {
    return this.prisma.voucher.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
