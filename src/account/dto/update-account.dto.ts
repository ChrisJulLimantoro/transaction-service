import { z } from 'zod';

export class UpdateAccountRequest {
  company_id: number | null;
  code: number | null;
  name: string | null;
  account_type_id: number | null; 
  store_id: string | null;
  deactive: boolean | null;
  description: string | null;

  constructor( { company_id, code, name, account_type_id, store_id, deactive, description }) {
    this.company_id = company_id;
    this.code = code;
    this.name = name;
    this.account_type_id = account_type_id;
    this.store_id = store_id;
    this.deactive = deactive;
    this.description = description;
  }

  static schema() {
    return z.object({
        code: z.number().int().min(1).optional(),
        name: z.string().min(1).max(255).optional().transform((name) => name.toUpperCase()),
        account_type_id: z.number().int().optional(),
        store_id: z.string().uuid().optional().nullable(),
        company_id: z.string().uuid().optional(),
        deactive: z.boolean().optional(),
        description: z.string().optional().nullable(),    
    });
  }
}
