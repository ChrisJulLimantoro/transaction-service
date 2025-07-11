import { z } from 'zod';
export class CreateTransactionProductRequest {
  transaction_id: string;
  product_code_id: string | null;
  name: string | null;
  type: string | null;
  transaction_type: number;
  weight: number;
  is_broken: boolean;
  price: number;
  adjustment_price: number;
  discount: number;
  total_price: number;
  status: number;

  constructor({
    transaction_id,
    product_code_id,
    transaction_type,
    name,
    type,
    weight,
    is_broken = false,
    price,
    adjustment_price,
    discount,
    total_price,
    status,
  }) {
    this.transaction_id = transaction_id;
    this.product_code_id = product_code_id;
    this.name = name;
    this.type = type;
    this.transaction_type = parseInt(transaction_type);
    this.weight = parseFloat(weight);
    this.is_broken = is_broken;
    this.price = parseFloat(price);
    this.adjustment_price = parseFloat(adjustment_price);
    this.discount = parseFloat(discount);
    this.total_price = parseFloat(total_price);
    this.status = parseInt(status);
  }

  static schema() {
    return z.object({
      transaction_id: z.string().uuid(),
      product_code_id: z.string().uuid().nullable().optional(),
      name: z.string().nullable(),
      type: z.string().nullable(),
      transaction_type: z.number(),
      weight: z.number(),
      is_broken: z.boolean(),
      price: z.number(),
      adjustment_price: z.number(),
      discount: z.number(),
      total_price: z.number(),
      status: z.number(),
    });
  }
}
