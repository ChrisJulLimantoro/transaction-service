import { UUID } from 'crypto';
import { z } from 'zod';
export class CreateUserRequest {
  id: string;
  email: string;
  name: string;

  constructor(data: { id: string; email: string; name: string }) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name;
  }

  static schema() {
    return z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      name: z.string().min(3).max(255),
    });
  }
}
