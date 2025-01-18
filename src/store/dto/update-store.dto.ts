import { z } from 'zod';
export class UpdateStoreRequest {
  code: string | null;
  name: string | null;
  is_active: boolean | null;
  is_flex_price: boolean | null;
  is_float_price: boolean | null;
  poin_config: number | null;

  constructor(data: {
    code: string | null;
    name: string | null;
    npwp: string | null;
    is_active: boolean | null;
    is_flex_price: boolean | null;
    is_float_price: boolean | null;
    poin_config: number | null;
  }) {
    this.code = data.code;
    this.name = data.name;
    this.is_active = data.is_active;
    this.is_flex_price = data.is_flex_price;
    this.is_float_price = data.is_float_price;
    this.poin_config = data.poin_config;
  }

  static schema() {
    return z.object({
      code: z.string().max(5).optional(),
      name: z.string().min(5).optional(),
      is_active: z.boolean().nullable().optional(),
      is_flex_price: z.boolean().nullable().optional(),
      is_float_price: z.boolean().nullable().optional(),
      poin_config: z.number().nullable().optional(),
    });
  }
}
