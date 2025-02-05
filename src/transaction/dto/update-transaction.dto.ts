import { z } from 'zod';
export class UpdateTransactionRequest {
  date: Date;
  customer_id: string;

  constructor(data: { date: string; customer_id: string }) {
    this.date = new Date(data.date);
    this.customer_id = data.customer_id;
  }

  static schema() {
    return z.object({
      date: z.date(),
      customer_id: z.string().uuid(),
    });
  }
}
