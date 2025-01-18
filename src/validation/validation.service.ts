import { Injectable } from '@nestjs/common';
import { ZodType } from 'zod';

@Injectable()
export class ValidationService {
  validate<T>(data: T, schema: ZodType<T>): T {
    return schema.parse(data);
  }
}
