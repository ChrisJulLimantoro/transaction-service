import { z } from 'zod';
export class UpdateTransactionRequest {
  date: Date | null;
  customer_id: string | null;
  employee_id: string | null;
  payment_method: number | null;
  paid_amount: number | null;
  status: number | null;
  account_id: string | null;

  constructor({
    date,
    customer_id,
    employee_id,
    payment_method,
    paid_amount,
    status,
    account_id
  }) {
    this.date = new Date(date);
    this.customer_id = customer_id;
    this.employee_id = employee_id;
    this.payment_method = parseInt(payment_method);
    this.paid_amount = parseFloat(paid_amount);
    this.status = parseInt(status);
    this.account_id = account_id
  }

  static schema() {
    return z.object({
      date: z.date().nullable().optional(),
      customer_id: z.string().nullable().optional(),
      employee_id: z.string().nullable().optional(),
      payment_method: z.number().nullable().optional(),
      paid_amount: z.number().min(0).nullable().optional(),
      status: z.number().nullable().optional(),
      account_id: z.string().uuid().nullable().optional(),
    });
  }
}
