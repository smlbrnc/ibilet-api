import { HttpStatus } from '@nestjs/common';

export const CMS_ERROR_MESSAGES = {
  BLOGS_ERROR: {
    code: 'BLOGS_ERROR',
    message: 'Bloglar getirilemedi',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  BLOG_NOT_FOUND: {
    code: 'BLOG_NOT_FOUND',
    message: 'Blog bulunamadı',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  BLOG_ERROR: {
    code: 'BLOG_ERROR',
    message: 'Blog getirilemedi',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  CAMPAIGNS_ERROR: {
    code: 'CAMPAIGNS_ERROR',
    message: 'Kampanyalar getirilemedi',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  CAMPAIGN_NOT_FOUND: {
    code: 'CAMPAIGN_NOT_FOUND',
    message: 'Kampanya bulunamadı',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  CAMPAIGN_ERROR: {
    code: 'CAMPAIGN_ERROR',
    message: 'Kampanya getirilemedi',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  DISCOUNTS_ERROR: {
    code: 'DISCOUNTS_ERROR',
    message: 'İndirimler getirilemedi',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  DISCOUNT_INVALID: {
    code: 'DISCOUNT_INVALID',
    message: 'Geçersiz indirim kodu',
    httpStatus: HttpStatus.NOT_FOUND,
  },
  DISCOUNT_EXPIRED: {
    code: 'DISCOUNT_EXPIRED',
    message: 'İndirim kodu kullanım limitine ulaştı',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  DISCOUNT_ERROR: {
    code: 'DISCOUNT_ERROR',
    message: 'İndirim kodu doğrulanamadı',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  TREND_HOTELS_ERROR: {
    code: 'TREND_HOTELS_ERROR',
    message: 'Trend oteller getirilemedi',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  TREND_FLIGHTS_ERROR: {
    code: 'TREND_FLIGHTS_ERROR',
    message: 'Trend uçuşlar getirilemedi',
    httpStatus: HttpStatus.BAD_REQUEST,
  },
} as const;

export const CMS_DEFAULT_LIMITS = {
  BLOGS: 10,
  CAMPAIGNS: 10,
  TREND_HOTELS: 6,
  TREND_FLIGHTS: 6,
} as const;
