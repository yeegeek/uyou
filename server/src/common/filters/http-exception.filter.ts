import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let errorResponse: any = {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    };

    if (typeof exceptionResponse === 'object') {
      errorResponse = {
        code: (exceptionResponse as any).code || 'INTERNAL_ERROR',
        message: (exceptionResponse as any).message || exception.message,
        details: (exceptionResponse as any).details,
      };
    } else {
      errorResponse.message = exceptionResponse;
    }

    response.status(status).json(errorResponse);
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof Error ? exception.message : 'Internal server error';

    response.status(status).json({
      code: 'INTERNAL_ERROR',
      message,
    });
  }
}
