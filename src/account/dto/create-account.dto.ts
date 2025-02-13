import { z } from 'zod';

export class CreateAccountRequest {
  id: string;
  company_id: number;
  code: number;
  name: string;
  account_type_id: number; 
  store_id: string;
  deactive: boolean;
  description: string;

  constructor( { id, company_id, code, name, account_type_id, store_id, deactive, description }) {
    this.id = id;
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
        id: z.string().uuid(),
        company_id: z.string().uuid(),
        code: z.number().int().min(1),
        name: z.string().min(1).max(255).transform((name) => name.toUpperCase()),
        account_type_id: z.number().int(),
        store_id: z.string().uuid().optional().nullable(),
        deactive: z.boolean().optional().nullable(),
        description: z.string().optional().nullable(),
    });
  }
}
