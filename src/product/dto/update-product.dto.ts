import { z } from 'zod';

export class UpdateProductRequest {
  name: string | null;
  code: string | null;
  buy_price: number | null;

  constructor({ name, code, buy_price }) {
    this.name = name;
    this.code = code;
    this.buy_price = buy_price;
  }

  static schema() {
    return z.object({
      name: z.string().min(3).max(255).nullable().optional(),
      code: z.string().max(25).nullable().optional(),
      buy_price: z.number().nullable().optional(),
    });
  }
}
