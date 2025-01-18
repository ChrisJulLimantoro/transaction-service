import { z } from 'zod';

export class CreatePriceRequest {
  id: string;
  price: number;
  type_id: string;

  constructor({ id, price, type_id }) {
    this.id = id;
    this.price = parseFloat(price);
    this.type_id = type_id;
  }

  static schema() {
    return z.object({
      id: z.string().uuid(),
      price: z.number().positive(),
      type_id: z.string().uuid(),
    });
  }
}
