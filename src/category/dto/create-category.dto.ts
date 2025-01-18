import { z } from 'zod';

export class CreateCategoryRequest {
  id: string;
  name: string;
  code: string;
  company_id: string;

  constructor({ id, name, code, company_id }) {
    this.id = id;
    this.name = name;
    this.code = code;
    this.company_id = company_id;
  }

  static schema() {
    return z.object({
      id: z.string().uuid(),
      name: z.string().min(3).max(255),
      code: z.string().max(5),
      company_id: z.string().uuid(),
    });
  }
}
