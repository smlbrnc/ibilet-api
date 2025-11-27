/**
 * VPOS Hata Kodları Utility Fonksiyonları
 * Garanti Bankası VPOS API hata kodları ve mesajları için yardımcı fonksiyonlar
 */

import { VposErrorCode, VposErrorMessages } from '../enums/error-codes.enum';

export interface ErrorDetails {
  errorCode: string;
  message: string;
  category: string | null;
  httpStatus: number;
  isCritical: boolean;
  isUserFixable: boolean;
  shouldRetry: boolean;
  timestamp: string;
}

const errorCategories: Record<string, string[]> = {
  validation: ['0001', '0002', '0003', '0231'],
  transaction: ['0101', '0102', '0103', '0104', '0108', '0109', '0110', '0111', '0113', '0122'],
  refund_cancel: ['0201', '0202', '0203', '0204', '0207', '0208', '0209', '0210', '0214', '0217'],
  limit: ['0402', '0405'],
  auth: ['0651', '0652', '0653', '0654'],
  terminal: ['0752', '0753', '0756', '0759', '0763', '0764', '0769', '0770', '0771', '0773', '0785'],
  security: ['0804'],
  system: ['9999', '9998'],
};

/**
 * Hata koduna göre detaylı hata bilgisi getirir
 */
export function getErrorDetails(errorCode: string): ErrorDetails {
  const message = VposErrorMessages[errorCode as VposErrorCode] || 'Bilinmeyen hata kodu';

  // Hata kategorisini bul
  let category: string | null = null;
  for (const [cat, codes] of Object.entries(errorCategories)) {
    if (codes.includes(errorCode)) {
      category = cat;
      break;
    }
  }

  // HTTP status kodunu belirle
  let httpStatus = 400; // Default: Bad Request
  if (category) {
    switch (category) {
      case 'validation':
        httpStatus = 400;
        break;
      case 'auth':
        httpStatus = 401;
        break;
      case 'limit':
        httpStatus = 429;
        break;
      case 'transaction':
      case 'refund_cancel':
        httpStatus = 404;
        break;
      case 'terminal':
      case 'security':
        httpStatus = 403;
        break;
      case 'system':
        httpStatus = 500;
        break;
    }
  }

  // Kritik hata kontrolü
  const criticalCategories = ['auth', 'terminal', 'security', 'system'];
  const isCritical = criticalCategories.includes(category || '');

  // Kullanıcı tarafından düzeltilebilir hata kontrolü
  const userFixableCategories = ['validation', 'limit'];
  const isUserFixable = userFixableCategories.includes(category || '');

  // Tekrar deneme kontrolü
  const retryableCodes = ['0122', '0770', '0771', '0773', '9999', '9998'];
  const shouldRetry = retryableCodes.includes(errorCode);

  return {
    errorCode,
    message,
    category,
    httpStatus,
    isCritical,
    isUserFixable,
    shouldRetry,
    timestamp: new Date().toISOString(),
  };
}

