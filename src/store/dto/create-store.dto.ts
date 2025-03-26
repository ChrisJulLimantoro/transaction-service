import { z } from 'zod';
export class CreateStoreRequest {
  id: string;
  code: string;
  name: string;
  company_id: string;
  logo: string | null;
  is_active: boolean | null;
  is_flex_price: boolean | null;
  is_float_price: boolean | null;
  poin_config: number | null;
  tax_percentage: number | null;
  grace_period: number | null;
  percent_tt_adjustment: number;
  fixed_tt_adjustment: number;
  percent_kbl_adjustment: number;
  fixed_kbl_adjustment: number;

  constructor({
    id,
    code,
    name,
    company_id,
    logo,
    is_active,
    is_flex_price,
    is_float_price,
    poin_config,
    tax_percentage,
    grace_period,
    percent_tt_adjustment,
    fixed_tt_adjustment,
    percent_kbl_adjustment,
    fixed_kbl_adjustment,
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
    this.logo = logo;
    this.grace_period = parseInt(grace_period);
    this.percent_tt_adjustment = parseFloat(percent_tt_adjustment);
    this.fixed_tt_adjustment = parseFloat(fixed_tt_adjustment);
    this.percent_kbl_adjustment = parseFloat(percent_kbl_adjustment);
    this.fixed_kbl_adjustment = parseFloat(fixed_kbl_adjustment);
  }

  static schema() {
    return z.object({
      id: z.string().uuid(),
      code: z.string().max(5),
      name: z.string().min(5),
      company_id: z.string().uuid(),
      logo: z.string().nullable().optional(),
      is_active: z.boolean().nullable().optional(),
      is_flex_price: z.boolean().nullable().optional(),
      is_float_price: z.boolean().nullable().optional(),
      poin_config: z.number().nullable().optional(),
      tax_percentage: z.number().nullable().optional(),
      grace_period: z.number().nullable().optional(),
      percent_tt_adjustment: z.number().max(100),
      fixed_tt_adjustment: z.number(),
      percent_kbl_adjustment: z.number().max(100),
      fixed_kbl_adjustment: z.number(),
    });
  }
}
