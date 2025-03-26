import { z } from 'zod';
export class CreateTransactionRequest {
  date: Date;
  code: string;
  customer_id: string;
  employee_id: string;
  store_id: string;
  voucher_own_id: string | null;
  transaction_type: number;
  payment_method: number;
  paid_amount: number;
  status: number;
  sub_total_price: number;
  tax_percent: number;
  tax_price: number;
  adjustment_price: number;
  total_price: number;
  comment: string | null;
  account_id: string | null;
  transaction_details: [];

  constructor({
    date,
    customer_id,
    code,
    employee_id,
    store_id,
    voucher_own_id,
    transaction_type,
    payment_method,
    paid_amount,
    status,
    sub_total_price,
    tax_percent,
    tax_price,
    adjustment_price,
    total_price,
    comment,
    transaction_details,
    account_id
  }) {
    this.date = new Date(date);
    this.customer_id = customer_id;
    this.code = code;
    this.employee_id = employee_id;
    this.store_id = store_id;
    this.voucher_own_id = voucher_own_id;
    this.transaction_type = parseInt(transaction_type);
    this.payment_method = parseInt(payment_method);
    this.paid_amount = parseFloat(paid_amount);
    this.status = parseInt(status);
    this.sub_total_price = parseFloat(sub_total_price);
    this.tax_percent = parseFloat(tax_percent);
    this.tax_price = parseFloat(tax_price);
    this.adjustment_price =
      adjustment_price != null ? parseFloat(adjustment_price) : 0;
    this.total_price = parseFloat(total_price);
    this.comment = comment;
    this.transaction_details = transaction_details;
    this.account_id = account_id;
  }

  static schema() {
    return z.object({
      date: z.date(),
      code: z.string(),
      customer_id: z.string().uuid(),
      employee_id: z.string().uuid(),
      store_id: z.string().uuid(),
      voucher_own_id: z.string().uuid().nullable().optional(),
      transaction_type: z.number(),
      payment_method: z.number(),
      paid_amount: z.number(),
      status: z.number(),
      sub_total_price: z.number(),
      tax_percent: z.number(),
      adjustment_price: z.number(),
      tax_price: z.number(),
      total_price: z.number(),
      comment: z.string().nullable().optional(),
      account_id: z.string().uuid().nullable().optional(),
    });
  }
}
