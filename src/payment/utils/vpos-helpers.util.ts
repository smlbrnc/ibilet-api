/**
 * VPOS Yardımcı Fonksiyonlar
 *
 * Tekrar eden kodları ve yardımcı fonksiyonları içerir
 */

export const VPOS_CONSTANTS = {
  URLS: {
    PRODUCTION: 'https://sanalposprov.garanti.com.tr/VPServlet',
    TEST: 'https://sanalposprovtest.garantibbva.com.tr/VPServlet',
  },
  PROV_USER_IDS: {
    REFUND: 'PROVRFN',
    AUTH: 'PROVAUT',
  },
  MOTO_IND: {
    REFUND: 'H',
    NORMAL: 'N',
  },
  CARDHOLDER_PRESENT_CODE: '0',
  DEFAULT_CURRENCY: '949',
  SUCCESS_CODE: '00',
  SUCCESS_MESSAGE: 'Approved',
};

/**
 * Benzersiz sipariş ID oluşturur
 * @param prefix - ID öneki (opsiyonel, varsayılan: 'IB')
 * @returns Benzersiz sipariş ID
 */
export function generateOrderId(prefix: string = 'IB'): string {
  const timestamp = Date.now();
  const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const randomNumbers = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}_${timestamp}_${randomLetter}${randomNumbers}`;
}

/**
 * Ortama göre VPOS URL'ini döner
 * @returns VPOS API URL'i
 */
export function getVposUrl(): string {
  return process.env.NODE_ENV === 'production'
    ? VPOS_CONSTANTS.URLS.PRODUCTION
    : VPOS_CONSTANTS.URLS.TEST;
}

/**
 * Ortama göre mode değerini döner
 * @returns 'PROD' veya 'TEST'
 */
export function getVposMode(): string {
  return process.env.NODE_ENV === 'production' ? 'PROD' : 'TEST';
}

/**
 * Kart numarasını maskeler
 * @param cardNumber - Kart numarası
 * @returns Maskelenmiş kart numarası (örn: 5406****1173)
 */
export function maskCardNumber(cardNumber: string | null | undefined): string | null {
  if (!cardNumber || cardNumber.length < 8) {
    return null;
  }
  return cardNumber.replace(/(.{4})(.*)(.{4})/, '$1****$3');
}

/**
 * İşlem tipine göre ProvUserID döner
 * @param isRefund - İade işlemi mi?
 * @param defaultProvUserId - Varsayılan ProvUserID
 * @returns ProvUserID
 */
export function getProvUserId(isRefund: boolean, defaultProvUserId: string): string {
  return isRefund ? VPOS_CONSTANTS.PROV_USER_IDS.REFUND : defaultProvUserId;
}

/**
 * İşlem tipine göre MotoInd değeri döner
 * @param isRefund - İade işlemi mi?
 * @returns MotoInd değeri
 */
export function getMotoInd(isRefund: boolean): string {
  return isRefund ? VPOS_CONSTANTS.MOTO_IND.REFUND : VPOS_CONSTANTS.MOTO_IND.NORMAL;
}

/**
 * İşlem başarılı mı kontrol eder
 * @param code - Dönüş kodu
 * @param message - Dönüş mesajı
 * @returns Başarılı mı?
 */
export function isTransactionSuccessful(
  code: string | null | undefined,
  message: string | null | undefined,
): boolean {
  return code === VPOS_CONSTANTS.SUCCESS_CODE && message === VPOS_CONSTANTS.SUCCESS_MESSAGE;
}

/**
 * Tutarı kuruştan TL'ye çevirir
 * @param amountInMinorUnits - Kuruş cinsinden tutar
 * @returns TL cinsinden tutar
 */
export function convertToMajorUnits(amountInMinorUnits: number | string): number {
  return parseFloat(String(amountInMinorUnits)) / 100;
}

/**
 * Kart son kullanma tarihini formatlar
 * @param month - Ay (MM)
 * @param year - Yıl (YY)
 * @returns Formatlanmış tarih (MMYY)
 */
export function formatCardExpireDate(month: string, year: string): string {
  return `${month}${year}`;
}

/**
 * İşlem tipine göre başarı mesajı döner
 * @param isRefund - İade işlemi mi?
 * @param isSuccess - İşlem başarılı mı?
 * @returns Başarı mesajı
 */
export function getTransactionMessage(isRefund: boolean, isSuccess: boolean): string {
  if (!isSuccess) {
    return 'İşlem başarısız';
  }
  return isRefund ? 'İade başarıyla tamamlandı' : 'Ödeme başarıyla tamamlandı';
}
