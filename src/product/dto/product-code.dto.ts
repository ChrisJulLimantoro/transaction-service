import { z } from 'zod';
export class ProductCodeDto {
  barcode: string;
  product_id: string;
  status: number;

  constructor({ barcode, product_id, status }) {
    this.barcode = barcode;
    this.product_id = product_id;
    this.status = status;
  }

  static schema() {
    return z.object({
      barcode: z.string().max(5),
      product_id: z.string().uuid(),
      status: z.number().optional(),
    });
  }
}
