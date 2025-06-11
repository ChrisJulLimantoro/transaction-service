import { z } from 'zod';
export class CreateTransactionOperationRequest {
  transaction_id: string;
  operation_id: string;
  name: string | null;
  type: string | null;
  unit: number;
  price: number;
  adjustment_price: number;
  total_price: number;
  status: number;

  constructor({
    transaction_id,
    operation_id,
    name,
    type,
    unit,
    price,
    adjustment_price,
    total_price,
  }) {
    this.transaction_id = transaction_id;
    this.operation_id = operation_id;
    this.name = name;
    this.type = type;
    this.unit = parseFloat(unit);
    this.price = parseFloat(price);
    this.adjustment_price = parseFloat(adjustment_price);
    this.total_price = parseFloat(total_price);
  }

  static schema() {
    return z.object({
      transaction_id: z.string().uuid(),
      operation_id: z.string().uuid(),
      name: z.string().nullable(),
      type: z.string().nullable(),
      unit: z.number(),
      price: z.number(),
      adjustment_price: z.number(),
      total_price: z.number(),
    });
  }
}
