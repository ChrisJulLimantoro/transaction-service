import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Catch()
export class RPCExceptionFilter<T> implements ExceptionFilter {
  catch(exception: T, host: ArgumentsHost) {
    console.log('Exception thrown:', exception);
    const ctx = host.switchToRpc();
    const data = ctx.getData();

    // Check if the exception is a ZodError
    if (exception instanceof ZodError) {
      const formattedErrors = this.formatZodError(exception);
      const errorResponse = {
        statusCode: 400,
        message: 'Validation failed',
        errors: formattedErrors,
      };

      console.log('Validation error response:', errorResponse);
      return errorResponse; // Return formatted validation errors
    }

    // Check if the exception is a PrismaClientKnownRequestError
    if (exception instanceof PrismaClientKnownRequestError) {
      const formattedErrors = this.formatPrismaError(exception);
      const errorResponse = {
        statusCode: 400,
        message: 'Database error',
        errors: formattedErrors,
      };

      console.log('Database error response:', errorResponse);
      return errorResponse; // Return formatted database errors
    }

    // Fallback for unknown errors
    const errorResponse = {
      statusCode: 500,
      message:
        exception instanceof Error
          ? exception.message
          : 'Internal server error',
      error: exception instanceof Error ? exception.message : exception,
      data: data, // Optional: include the original data for debugging
    };

    console.log('Fallback error response:', errorResponse);
    return errorResponse; // Return the fallback error response
  }

  // Helper method to format ZodError
  private formatZodError(error: ZodError): Record<string, any>[] {
    return error.issues.map((issue) => {
      const formattedIssue: Record<string, any> = {
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      };

      // Include additional properties for specific error types
      if ('expected' in issue) formattedIssue.expected = issue.expected;
      if ('received' in issue) formattedIssue.received = issue.received;
      if ('minimum' in issue) formattedIssue.minimum = issue.minimum;
      if ('maximum' in issue) formattedIssue.maximum = issue.maximum;
      if ('inclusive' in issue) formattedIssue.inclusive = issue.inclusive;
      if ('exact' in issue) formattedIssue.exact = issue.exact;

      return formattedIssue;
    });
  }

  // Helper method to format PrismaClientKnownRequestError
  private formatPrismaError(
    error: PrismaClientKnownRequestError,
  ): Record<string, any>[] {
    // Customize based on Prisma error codes
    console.log('Prisma error:', error);
    let message = 'Database error';
    const formattedIssue: Record<string, any> = {
      code: error.code,
      message: error.message,
    };

    // Include relevant details based on the error code
    switch (error.code) {
      case 'P2002': // Unique constraint failed
        message = `${error.meta?.target[0]} already exists`;
        formattedIssue.field = error.meta?.target[0] || [];
        break;
      case 'P2003': // Foreign key constraint failed
        message = 'Foreign key constraint failed';
        break;
      case 'P2025': // Record not found
        message = 'Record not found';
        break;
      default:
        message = 'An unknown database error occurred';
        break;
    }

    formattedIssue.message = message;
    return [formattedIssue];
  }
}
