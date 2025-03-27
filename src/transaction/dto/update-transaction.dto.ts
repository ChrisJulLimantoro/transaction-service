import { z } from 'zod';
export class UpdateTransactionRequest {
  date: Date | null;
  customer_id: string | null;
  employee_id: string | null;
  payment_method: number | null;
  paid_amount: number | null;
  tax_percent: number | null;
  tax_price: number | null;
  adjustment_price: number | null;
  total_price: number | null;
  status: number | null;
  account_id: string | null;
  comment: string | null;

  constructor({
    date,
    customer_id,
    employee_id,
    payment_method,
    paid_amount,
    tax_percent,
    tax_price,
    adjustment_price,
    total_price,
    status,
    account_id,
    comment,
  }) {
    this.date = new Date(date);
    this.customer_id = customer_id;
    this.employee_id = employee_id;
    this.payment_method = parseInt(payment_method);
    this.paid_amount = parseFloat(paid_amount);
    this.tax_percent = parseFloat(tax_percent);
    this.tax_price = parseFloat(tax_price);
    this.adjustment_price = parseFloat(adjustment_price ?? 0);
    this.total_price = parseFloat(total_price);
    this.status = parseInt(status);
    this.account_id = account_id;
    this.comment = comment;
  }

  static schema() {
    return z.object({
      date: z.date().nullable().optional(),
      customer_id: z.string().nullable().optional(),
      employee_id: z.string().nullable().optional(),
      payment_method: z.number().nullable().optional(),
      paid_amount: z.number().nullable().optional(),
      tax_percent: z.number().min(0).nullable().optional(),
      tax_price: z.number().nullable().optional(),
      adjustment_price: z.number().nullable().optional(),
      total_price: z.number().nullable().optional(),
      status: z.number().nullable().optional(),
      account_id: z.string().uuid().nullable().optional(),
      comment: z.string().nullable().optional(),
    });
  }
}
