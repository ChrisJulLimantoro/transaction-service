import { z } from 'zod';
export class CreateStoreRequest {
  id: string;
  code: string;
  name: string;
  company_id: string;
  is_active: boolean | null;
  is_flex_price: boolean | null;
  is_float_price: boolean | null;
  poin_config: number | null;
  tax_percentage: number | null;
  grace_period: number | null;

  constructor({
    id,
    code,
    name,
    company_id,
    is_active,
    is_flex_price,
    is_float_price,
    poin_config,
    tax_percentage,
    grace_period,
  }) {
    this.id = id;
    this.code = code;
    this.name = name;
    this.is_active = is_active;
    this.is_flex_price = is_flex_price;
    this.is_float_price = is_float_price;
    this.poin_config = parseFloat(poin_config);
    this.tax_percentage = parseFloat(tax_percentage);
    this.company_id = company_id;
    this.grace_period = parseInt(grace_period);
  }

  static schema() {
    return z.object({
      id: z.string().uuid(),
      code: z.string().max(5),
      name: z.string().min(5),
      company_id: z.string().uuid(),
      is_active: z.boolean().nullable().optional(),
      is_flex_price: z.boolean().nullable().optional(),
      is_float_price: z.boolean().nullable().optional(),
      poin_config: z.number().nullable().optional(),
      tax_percentage: z.number().nullable().optional(),
      grace_period: z.number().nullable().optional(),
    });
  }
}
