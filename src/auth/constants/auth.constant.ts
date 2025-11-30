import { HttpStatus } from '@nestjs/common';

export const AUTH_ERROR_MESSAGES = {
  SIGNUP_ERROR: {
    code: 'SIGNUP_ERROR',
    message: 'Kayıt işlemi başarısız',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  SIGNIN_ERROR: {
    code: 'SIGNIN_ERROR',
    message: 'Giriş işlemi başarısız',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  SIGNOUT_ERROR: {
    code: 'SIGNOUT_ERROR',
    message: 'Çıkış işlemi başarısız',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Yetkisiz erişim',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  REFRESH_ERROR: {
    code: 'REFRESH_ERROR',
    message: 'Token yenileme başarısız',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  RESET_PASSWORD_ERROR: {
    code: 'RESET_PASSWORD_ERROR',
    message: 'Şifre sıfırlama başarısız',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  UPDATE_PASSWORD_ERROR: {
    code: 'UPDATE_PASSWORD_ERROR',
    message: 'Şifre güncelleme başarısız',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  MAGIC_LINK_ERROR: {
    code: 'MAGIC_LINK_ERROR',
    message: 'Magic link gönderilemedi',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  VERIFICATION_ERROR: {
    code: 'VERIFICATION_ERROR',
    message: 'Email doğrulama başarısız',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  GET_USER_ERROR: {
    code: 'GET_USER_ERROR',
    message: 'Kullanıcı bilgileri alınamadı',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  INVALID_TOKEN: {
    code: 'INVALID_TOKEN',
    message: 'Geçersiz veya süresi dolmuş token',
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
} as const;

export const AUTH_SUCCESS_MESSAGES = {
  SIGNUP: 'Kullanıcı başarıyla kaydedildi',
  SIGNIN: 'Giriş başarılı',
  SIGNOUT: 'Çıkış başarılı',
  REFRESH: 'Token yenilendi',
  RESET_PASSWORD: 'Şifre sıfırlama linki email adresinize gönderildi',
  UPDATE_PASSWORD: 'Şifreniz başarıyla güncellendi',
  MAGIC_LINK: 'Magic link gönderildi',
  EMAIL_VERIFIED: 'Email doğrulandı',
} as const;

