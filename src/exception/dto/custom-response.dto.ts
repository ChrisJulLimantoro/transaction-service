export class CustomResponse {
  statusCode: number;
  success: boolean;
  message: string;
  data?: any;
  errors?: any;

  constructor({ success, statusCode, message, data = null, errors = null }) {
    this.success = success;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.errors = errors;
  }

  static error(
    message: string,
    errors: any,
    statusCode = 400,
    success = false,
  ) {
    return new CustomResponse({ success, statusCode, message, errors });
  }

  static success(message: string, data: any, statusCode = 200, success = true) {
    return new CustomResponse({ success, statusCode, message, data });
  }
}
