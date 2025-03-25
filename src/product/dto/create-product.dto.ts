import { z } from 'zod';

export class CreateProductRequest {
  id: string;
  name: string;
  code: string;
  type_id: string;
  store_id: string;
  status: number;
  buy_price: number;

  constructor({ id, name, code, type_id, store_id, buy_price }) {
    this.id = id;
    this.name = name;
    this.code = code;
    this.type_id = type_id;
    this.store_id = store_id;
    this.status = 1;
    this.buy_price = buy_price;
  }

  static schema() {
    return z.object({
      id: z.string().uuid(),
      name: z.string().min(3).max(255),
      code: z.string().max(25),
      type_id: z.string().uuid(),
      store_id: z.string().uuid(),
      status: z.number().optional(),
      buy_price: z.number().optional(),
    });
  }
}
