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
  approve: number | null;
  approve_by: string | null;

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
    approve,
    approve_by,
  }) {
    this.date = date ? new Date(date) : null;
    this.customer_id = customer_id;
    this.employee_id = employee_id;
    this.payment_method = isNaN(Number(payment_method)) ? null : Number(payment_method);
    this.paid_amount = isNaN(Number(paid_amount)) ? null : Number(paid_amount);
    this.tax_percent = isNaN(Number(tax_percent)) ? null : Number(tax_percent);
    this.tax_price = isNaN(Number(tax_price)) ? null : Number(tax_price);
    this.adjustment_price = isNaN(Number(adjustment_price)) ? null : Number(adjustment_price);
    this.total_price = isNaN(Number(total_price)) ? null : Number(total_price);
    this.status = isNaN(Number(status)) ? null : Number(status);
    this.account_id = account_id;
    this.comment = comment;
    this.approve = approve != null ? approve : 0;
    this.approve_by = approve_by;
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
      approve: z.number().nullable().optional(),
      approve_by: z.string().nullable().optional(),
    });
  }
}
