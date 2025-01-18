import { z } from 'zod';

export class UpdateProductRequest {
  name: string | null;
  code: string | null;
  fixed_price: number | null;

  constructor({ name, code, fixed_price }) {
    this.name = name;
    this.code = code;
    this.fixed_price = parseFloat(fixed_price);
  }

  static schema() {
    return z.object({
      name: z.string().min(3).max(255).nullable().optional(),
      code: z.string().max(8).nullable().optional(),
      fixed_price: z.number().nullable().optional(),
    });
  }
}
