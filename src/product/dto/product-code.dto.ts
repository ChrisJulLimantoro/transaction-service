import { Decimal } from '@prisma/client/runtime/library';
import { z } from 'zod';
export class ProductCodeDto {
  id: string;
  barcode: string;
  product_id: string;
  status: number;
  weight: number;
  fixed_price: number;
  taken_out_at: Date;
  buy_price: number;

  constructor({
    id,
    barcode,
    product_id,
    status,
    weight,
    fixed_price,
    taken_out_at,
    buy_price,
  }) {
    this.id = id;
    this.barcode = barcode;
    this.product_id = product_id;
    this.status = parseInt(status);
    this.weight = parseFloat(weight);
    this.fixed_price = parseFloat(fixed_price);
    this.taken_out_at = taken_out_at ? new Date(taken_out_at) : null;
    this.buy_price = isNaN(parseFloat(buy_price))
      ? null
      : parseFloat(buy_price);
  }

  static schema() {
    return z.object({
      id: z.string().uuid(),
      barcode: z.string().max(25),
      product_id: z.string().uuid(),
      status: z.number().optional(),
      weight: z.number().optional(),
      fixed_price: z.number().optional(),
      taken_out_at: z.date().nullable().optional(),
      buy_price: z.number().nullable().optional(),
    });
  }
}
