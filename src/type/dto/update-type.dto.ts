import { z } from 'zod';

export class UpdateTypeRequest {
  name: string | null;
  code: string | null;

  constructor({ name, code }) {
    this.name = name;
    this.code = code;
  }

  static schema() {
    return z.object({
      name: z.string().min(3).max(255).nullable().optional(),
      code: z.string().max(5).nullable().optional(),
    });
  }
}
