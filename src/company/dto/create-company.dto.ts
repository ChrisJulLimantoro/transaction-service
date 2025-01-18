import { z } from 'zod';

export class CreateCompanyRequest {
  id: string;
  name: string;
  code: string;

  constructor({ id, name, code }) {
    this.id = id;
    this.name = name;
    this.code = code;
  }

  static schema() {
    return z.object({
      id: z.string().uuid(),
      name: z.string().min(3).max(255),
      code: z.string().max(5),
    });
  }
}
