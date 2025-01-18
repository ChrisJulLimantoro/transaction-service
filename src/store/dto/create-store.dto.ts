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

  constructor(data: {
    id: string;
    code: string;
    name: string;
    company_id: string;
    is_active: boolean | null;
    is_flex_price: boolean | null;
    is_float_price: boolean | null;
    poin_config: number | null;
  }) {
    this.id = data.id;
    this.code = data.code;
    this.name = data.name;
    this.company_id = data.company_id;
    this.is_active = data.is_active;
    this.is_flex_price = data.is_flex_price;
    this.is_float_price = data.is_float_price;
    this.poin_config = data.poin_config;
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
    });
  }
}
