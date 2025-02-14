import { z } from 'zod';

export class CreateOperationRequest {
  id: string;
  code: string;
  name: string;
  price: number;
  uom: string;
  description: string | null;
  store_id: string;
  account_id: string;

  constructor({ id, name, code, price, uom, store_id, account_id }) {
    this.id = id;
    this.name = name;
    this.code = code;
    this.price = parseFloat(price);
    this.uom = uom;
    this.store_id = store_id;
    this.account_id = account_id;
  }

  static schema() {
    return z.object({
      id: z.string().uuid(),
      name: z.string().min(3).max(255),
      code: z.string().max(15),
      price: z.number().nonnegative(),
      uom: z.string().max(15),
      store_id: z.string().uuid(),
      account_id: z.string().uuid().optional().nullable(),
    });
  }
}
