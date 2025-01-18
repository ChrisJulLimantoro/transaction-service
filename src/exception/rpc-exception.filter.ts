import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { ZodError } from 'zod';

@Catch()
export class RPCExceptionFilter<T> implements ExceptionFilter {
  catch(exception: T, host: ArgumentsHost) {
    console.log('Exception thrown', exception);
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
    } else {
      // Format the error response
      const errorResponse = {
        statusCode: 500,
        message: exception instanceof Error ? exception.message : exception,
        error: exception instanceof Error ? exception.message : exception,
        data: data, // Optional: include the original data for debugging
      };

      // Return the error response as the result of the RPC handler
      return errorResponse;
    }
  }

  // Helper method to format ZodError
  private formatZodError(error: ZodError): Record<string, any>[] {
    return error.issues.map((issue) => {
      const formattedIssue: Record<string, any> = {
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      };

      // Narrow down to issue types and include relevant properties
      if ('expected' in issue) formattedIssue.expected = issue.expected;
      if ('received' in issue) formattedIssue.received = issue.received;
      if ('minimum' in issue) formattedIssue.minimum = issue.minimum;
      if ('maximum' in issue) formattedIssue.maximum = issue.maximum;
      if ('inclusive' in issue) formattedIssue.inclusive = issue.inclusive;
      if ('exact' in issue) formattedIssue.exact = issue.exact;

      return formattedIssue;
    });
  }
}
