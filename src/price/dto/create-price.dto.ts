import { z } from 'zod';

export class CreatePriceRequest {
  id: string;
  price: number;
  type_id: string;
  date: Date;

  constructor({ id, price, type_id, date }) {
    this.id = id;
    this.price = parseFloat(price);
    this.date = new Date(date);
    this.type_id = type_id;
  }

  static schema() {
    return z.object({
      id: z.string().uuid(),
      price: z.number().positive(),
      type_id: z.string().uuid(),
      date: z.date(),
    });
  }
}
