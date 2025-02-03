import { Decimal } from '@prisma/client/runtime/library';
import { z } from 'zod';
export class ProductCodeDto {
  id: string;
  barcode: string;
  product_id: string;
  status: number;
  weight: number;
  fixed_price: number;

  constructor({ id, barcode, product_id, status, weight, fixed_price }) {
    this.id = id;
    this.barcode = barcode;
    this.product_id = product_id;
    this.status = status;
    this.weight = parseFloat(weight);
    this.fixed_price = parseFloat(fixed_price);
  }

  static schema() {
    return z.object({
      id: z.string().uuid(),
      barcode: z.string().max(25),
      product_id: z.string().uuid(),
      status: z.number().optional(),
      weight: z.number().optional(),
      fixed_price: z.number().optional(),
    });
  }
}
