import { Decimal } from '@prisma/client/runtime/library';
import { z } from 'zod';
export class ProductCodeDto {
  barcode: string;
  product_id: string;
  status: number;
  weight: number;

  constructor({ barcode, product_id, status, weight }) {
    this.barcode = barcode;
    this.product_id = product_id;
    this.status = status;
    this.weight = parseFloat(weight);
  }

  static schema() {
    return z.object({
      barcode: z.string().max(5),
      product_id: z.string().uuid(),
      status: z.number().optional(),
      weight: z.number().optional(),
    });
  }
}
