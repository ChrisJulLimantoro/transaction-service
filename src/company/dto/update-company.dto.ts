import { z } from 'zod';

export class UpdateCompanyRequest {
  code: string | null;
  name: string | null;

  constructor({ code, name }) {
    this.code = code;
    this.name = name;
  }

  static schema() {
    return z.object({
      code: z.string().max(5).optional(),
      name: z.string().min(3).max(255).optional(),
    });
  }
}
