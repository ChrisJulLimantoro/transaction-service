import { ZodType, z } from 'zod';

export class VoucherValidation {
  static readonly CREATE: ZodType = z
    .object({
      voucher_name: z.string().min(1, { message: 'Voucher name is required' }),
      discount_amount: z
        .number()
        .positive({ message: 'Discount amount must be greater than 0' }),
      max_discount: z
        .number()
        .positive({ message: 'Max discount must be greater than 0' }),
      minimum_purchase: z
        .number()
        .positive({ message: 'Minimum purchase must be greater than 0' }),
      poin_price: z
        .number()
        .positive({ message: 'Point price must be greater than 0' }),
      description: z.string().optional(),
      start_date: z
        .string()
        .regex(
          /^\d{4}-\d{2}-\d{2}$/,
          'Invalid date format. Expected format: YYYY-MM-DD',
        ),
      end_date: z
        .string()
        .regex(
          /^\d{4}-\d{2}-\d{2}$/,
          'Invalid date format. Expected format: YYYY-MM-DD',
        ),
      is_active: z.boolean(),
      store_id: z.string().uuid('Invalid store ID format'),
    })
    .refine((data) => new Date(data.start_date) <= new Date(data.end_date), {
      message: 'End date must be greater than or equal to start date',
      path: ['end_date'],
    })
    .refine((data) => data.max_discount >= data.discount_amount, {
      message: 'Max discount must be greater than or equal to discount amount',
      path: ['max_discount'],
    });
}
