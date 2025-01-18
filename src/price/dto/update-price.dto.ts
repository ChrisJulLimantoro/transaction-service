import { z } from 'zod';

export class UpdatePriceRequest {
  price: number;

  constructor({ price }) {
    this.price = parseFloat(price);
  }

  static schema() {
    return z.object({
      price: z.number().positive(),
    });
  }
}
