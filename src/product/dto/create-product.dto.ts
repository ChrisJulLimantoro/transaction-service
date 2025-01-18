import { z } from 'zod';

export class CreateProductRequest {
  id: string;
  name: string;
  code: string;
  fixed_price: number;
  type_id: string;
  store_id: string;
  status: number;

  constructor({ id, name, code, fixed_price, type_id, store_id }) {
    this.id = id;
    this.name = name;
    this.code = code;
    this.fixed_price = parseFloat(fixed_price);
    this.type_id = type_id;
    this.store_id = store_id;
    this.status = 1;
  }

  static schema() {
    return z.object({
      id: z.string().uuid(),
      name: z.string().min(3).max(255),
      code: z.string().max(8),
      fixed_price: z.number(),
      type_id: z.string().uuid(),
      store_id: z.string().uuid(),
      status: z.number().optional(),
    });
  }
}
