import { z } from 'zod';

export class CreateTypeRequest {
  id: string;
  name: string;
  code: string;
  category_id: string;

  constructor({ id, name, code, category_id }) {
    this.id = id;
    this.name = name;
    this.code = code;
    this.category_id = category_id;
  }

  static schema() {
    return z.object({
      id: z.string().uuid(),
      name: z.string().min(3).max(255),
      code: z.string().max(15),
      category_id: z.string().uuid(),
    });
  }
}
