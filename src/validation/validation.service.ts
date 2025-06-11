import { Injectable } from '@nestjs/common';
import { ZodType, ZodError } from 'zod';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ValidationService {
  validate<T>(data: T, schema: ZodType<T>): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        // Re-throw as RPC exception for consistent microservice error handling
        throw new RpcException({
          statusCode: 400,
          message: 'Validation failed',
          errors: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        });
      }

      throw error; // Non-Zod error
    }
  }
}
