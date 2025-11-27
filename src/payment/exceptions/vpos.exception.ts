import { HttpException, HttpStatus } from '@nestjs/common';
import { VposErrorCode, VposErrorMessages } from '../enums/error-codes.enum';
import { getErrorDetails } from '../utils/vpos-errors.util';

/**
 * VPOS Base Exception
 */
export class VposException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly errorCode?: string,
    public readonly errorDetails?: any,
  ) {
    super(
      {
        success: false,
        code: errorCode || 'VPOS_ERROR',
        message,
        ...(errorDetails && { details: errorDetails }),
      },
      statusCode,
    );
  }
}

/**
 * VPOS Validation Exception
 */
export class VposValidationException extends VposException {
  constructor(message: string, details?: any) {
    super(message, HttpStatus.BAD_REQUEST, 'VPOS_VALIDATION_ERROR', details);
  }
}

/**
 * VPOS Transaction Exception
 */
export class VposTransactionException extends VposException {
  constructor(errorCode: string, details?: any) {
    const errorDetails = getErrorDetails(errorCode);
    super(
      errorDetails.message,
      errorDetails.httpStatus,
      errorCode,
      { ...errorDetails, ...details },
    );
  }
}

/**
 * VPOS Security Exception
 */
export class VposSecurityException extends VposException {
  constructor(message: string = 'Güvenlik hatası', details?: any) {
    super(message, HttpStatus.FORBIDDEN, 'VPOS_SECURITY_ERROR', details);
  }
}

/**
 * VPOS System Exception
 */
export class VposSystemException extends VposException {
  constructor(message: string = 'Sistem hatası', details?: any) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, 'VPOS_SYSTEM_ERROR', details);
  }
}

