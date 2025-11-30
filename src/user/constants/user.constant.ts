import { HttpStatus } from '@nestjs/common';

export const USER_ERROR_MESSAGES = {
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Yetkisiz erişim',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  PROFILE_ERROR: {
    code: 'PROFILE_ERROR',
    message: 'Profil işlemi başarısız',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  FAVORITES_ERROR: {
    code: 'FAVORITES_ERROR',
    message: 'Favori işlemi başarısız',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  TRAVELLERS_ERROR: {
    code: 'TRAVELLERS_ERROR',
    message: 'Yolcu işlemi başarısız',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  TRAVELLER_NOT_FOUND: {
    code: 'TRAVELLER_NOT_FOUND',
    message: 'Yolcu bulunamadı',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  NOTIFICATIONS_ERROR: {
    code: 'NOTIFICATIONS_ERROR',
    message: 'Bildirim işlemi başarısız',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  TRANSACTIONS_ERROR: {
    code: 'TRANSACTIONS_ERROR',
    message: 'İşlem getirilemedi',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  TRANSACTION_NOT_FOUND: {
    code: 'TRANSACTION_NOT_FOUND',
    message: 'İşlem bulunamadı',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  USER_DISCOUNTS_ERROR: {
    code: 'USER_DISCOUNTS_ERROR',
    message: 'İndirim işlemi başarısız',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  DISCOUNT_INVALID: {
    code: 'DISCOUNT_INVALID',
    message: 'Geçersiz veya kullanılmış indirim kodu',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  EMAIL_REQUIRED: {
    code: 'EMAIL_REQUIRED',
    message: 'Email adresi gereklidir',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  CHECK_EMAIL_ERROR: {
    code: 'CHECK_EMAIL_ERROR',
    message: 'Email kontrolü yapılamadı',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
} as const;

export const USER_SUCCESS_MESSAGES = {
  PROFILE_UPDATED: 'Profil güncellendi',
  FAVORITE_ADDED: 'Favori eklendi',
  FAVORITE_REMOVED: 'Favori silindi',
  TRAVELLER_ADDED: 'Yolcu eklendi',
  TRAVELLER_UPDATED: 'Yolcu güncellendi',
  TRAVELLER_REMOVED: 'Yolcu silindi',
  NOTIFICATION_READ: 'Bildirim okundu olarak işaretlendi',
  ALL_NOTIFICATIONS_READ: 'Tüm bildirimler okundu olarak işaretlendi',
} as const;

