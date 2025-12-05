export const YOLCU360_ENDPOINTS = {
  AUTH_LOGIN: '/auth/login',
  AUTH_REFRESH: '/auth/refresh',
  LOCATIONS: '/locations',
  SEARCH_POINT: '/search/point',
  CAR_EXTRA_PRODUCTS: '/search',
  ORDER: '/order',
  PAYMENT_PAY: '/payment/pay',
  FINDEKS_CHECK: '/findeks/check',
  FINDEKS_PHONE_LIST: '/findeks/phone-list',
  FINDEKS_REPORT: '/findeks/report',
  FINDEKS_PIN_CONFIRM: '/findeks/pin-confirm',
  FINDEKS_PIN_RENEW: '/findeks/pin-renew',
} as const;

export const YOLCU360_CACHE_KEYS = {
  ACCESS_TOKEN: 'yolcu360:accessToken',
  REFRESH_TOKEN: 'yolcu360:refreshToken',
  ACCESS_TOKEN_EXP: 'yolcu360:accessTokenExp',
  REFRESH_TOKEN_EXP: 'yolcu360:refreshTokenExp',
} as const;

// Token yenileme için 5 dakika önceden refresh yap
export const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000;