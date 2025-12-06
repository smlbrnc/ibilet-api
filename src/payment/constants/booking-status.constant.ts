import { HttpStatus } from '@nestjs/common';

export interface StatusInfo {
  code: string;
  message: string;
  httpStatus: HttpStatus;
}

export const BOOKING_STATUS_MESSAGES: Record<string, StatusInfo> = {
  PAYMENT_IN_PROGRESS: {
    code: 'PAYMENT_ALREADY_INITIATED',
    message: 'Bu rezervasyon için ödeme zaten başlatılmış',
    httpStatus: HttpStatus.CONFLICT,
  },
  EXPIRED: {
    code: 'BOOKING_EXPIRED',
    message: 'Rezervasyon süresi dolmuş',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  FAILED: {
    code: 'PAYMENT_FAILED',
    message: 'Bu rezervasyon için ödeme başarısız oldu',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  SUCCESS: {
    code: 'PAYMENT_COMPLETED',
    message: 'Bu rezervasyon için ödeme zaten tamamlanmış',
    httpStatus: HttpStatus.CONFLICT,
  },
  CONFIRMED: {
    code: 'BOOKING_CONFIRMED',
    message: 'Bu rezervasyon zaten onaylanmış',
    httpStatus: HttpStatus.CONFLICT,
  },
  COMMIT_FAILED: {
    code: 'COMMIT_FAILED',
    message: 'Rezervasyon onaylaması başarısız oldu',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  REFUND_PENDING: {
    code: 'REFUND_PENDING',
    message: 'Bu rezervasyon için iade işlemi beklemede',
    httpStatus: HttpStatus.CONFLICT,
  },
  REFUNDED: {
    code: 'BOOKING_REFUNDED',
    message: 'Bu rezervasyon için iade yapılmış',
    httpStatus: HttpStatus.CONFLICT,
  },
  CANCELLED: {
    code: 'BOOKING_CANCELLED',
    message: 'Bu rezervasyon iptal edilmiş',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
} as const;

export const DEFAULT_STATUS_INFO: StatusInfo = {
  code: 'INVALID_BOOKING_STATUS',
  message: 'Rezervasyon durumu ödeme başlatmaya uygun değil',
  httpStatus: HttpStatus.BAD_REQUEST,
};
