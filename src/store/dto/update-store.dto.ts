import { z } from 'zod';
export class UpdateStoreRequest {
  code: string | null;
  name: string | null;
  is_active: boolean | null;
  is_flex_price: boolean | null;
  is_float_price: boolean | null;
  poin_config: number | null;
  tax_percentage: number | null;

  constructor({
    code,
    name,
    is_active,
    is_flex_price,
    is_float_price,
    poin_config,
    tax_percentage,
  }) {
    this.code = code;
    this.name = name;
    this.is_active = is_active;
    this.is_flex_price = is_flex_price;
    this.is_float_price = is_float_price;
    this.poin_config = parseFloat(poin_config);
    this.tax_percentage = parseFloat(tax_percentage);
  }

  static schema() {
    return z.object({
      code: z.string().max(5).optional(),
      name: z.string().min(5).optional(),
      is_active: z.boolean().nullable().optional(),
      is_flex_price: z.boolean().nullable().optional(),
      is_float_price: z.boolean().nullable().optional(),
      poin_config: z.number().nullable().optional(),
      tax_percentage: z.number().nullable().optional(),
    });
  }
}
