import { z } from 'zod';

export class UpdateOperationRequest {
  code: string | null;
  name: string | null;
  price: number | null;
  uom: string | null;

  constructor({ code, name, price, uom }) {
    this.code = code;
    this.name = name;
    this.price = parseFloat(price);
    this.uom = uom;
  }

  static schema() {
    return z.object({
      code: z.string().max(15).optional(),
      name: z.string().min(3).max(255).optional(),
      price: z.number().nonnegative().optional(),
      uom: z.string().max(15).optional(),
    });
  }
}
