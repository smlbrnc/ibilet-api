import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const requestId = (request as any).requestId || 'unknown';

    let errorResponse: any;

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      // Eğer response zaten bizim formatımızda ise
      if (
        typeof exceptionResponse === 'object' &&
        'success' in exceptionResponse &&
        exceptionResponse.success === false
      ) {
        errorResponse = {
          ...exceptionResponse,
          requestId,
        };
      } else {
        // Standart HttpException
        errorResponse = {
          success: false,
          code:
            typeof exceptionResponse === 'object' && 'code' in exceptionResponse
              ? exceptionResponse['code']
              : 'HTTP_EXCEPTION',
          message:
            typeof exceptionResponse === 'object' && 'message' in exceptionResponse
              ? exceptionResponse['message']
              : exception.message,
          requestId,
        };
      }
    } else {
      // Beklenmeyen hatalar
      errorResponse = {
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: exception instanceof Error ? exception.message : 'Internal server error',
        requestId,
      };
    }

    response.status(status).json(errorResponse);
  }
}

