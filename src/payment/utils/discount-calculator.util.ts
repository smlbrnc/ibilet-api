/**
 * İndirim Hesaplama Utility
 * 
 * Yüzde indirim ve sabit tutar indirim hesaplamalarını yapar.
 * Para birimi dönüşümlerini destekler (EUR → TRY).
 */

import { CurrencyCode } from '../enums/currency-codes.enum';

export interface DiscountCalculationParams {
  originalAmount: number; // kuruş cinsinden
  discountType: 'percentage' | 'fixed';
  discountValue: number; // yüzde için 0-100, sabit tutar için kuruş cinsinden (veritabanından gelen değer)
  discountCurrency?: string; // sabit tutar indirimler için para birimi (EUR, TRY)
  currencyCode: string; // ödeme para birimi ('949' = TRY, '978' = EUR, vb.)
  minPurchaseAmount?: number; // minimum alışveriş tutarı (kuruş cinsinden, veritabanından gelen değer)
  maxDiscountAmount?: number; // maksimum indirim tutarı (kuruş cinsinden, veritabanından gelen değer)
}

export interface DiscountCalculationResult {
  discountAmount: number; // kuruş cinsinden indirim tutarı
  finalAmount: number; // kuruş cinsinden final tutar
  originalAmount: number; // kuruş cinsinden orijinal tutar
  isValid: boolean;
  errorMessage?: string;
}

/**
 * EUR/TRY döviz kuru
 * TODO: Bu değer bir config'den veya external API'den alınmalı
 * Şimdilik sabit değer kullanıyoruz
 */
const EUR_TO_TRY_RATE = 35.0; // Örnek: 1 EUR = 35 TRY

/**
 * Para birimi kodunu string'e çevirir
 */
function getCurrencyString(code: string): string {
  const currencyMap: Record<string, string> = {
    '949': 'TRY',
    '978': 'EUR',
    '840': 'USD',
    '826': 'GBP',
    '392': 'JPY',
  };
  return currencyMap[code] || 'TRY';
}

/**
 * Sabit tutar indirim için para birimi dönüşümü yapar
 */
function convertFixedDiscountToPaymentCurrency(
  discountAmount: number,
  discountCurrency: string,
  paymentCurrency: string,
): number {
  // Aynı para birimiyse direkt döndür
  if (discountCurrency === paymentCurrency) {
    return discountAmount;
  }

  // EUR → TRY dönüşümü
  if (discountCurrency === 'EUR' && paymentCurrency === 'TRY') {
    return Math.round(discountAmount * EUR_TO_TRY_RATE);
  }

  // TRY → EUR dönüşümü (nadir durum)
  if (discountCurrency === 'TRY' && paymentCurrency === 'EUR') {
    return Math.round(discountAmount / EUR_TO_TRY_RATE);
  }

  // Diğer para birimleri için şimdilik desteklenmiyor
  // TODO: Daha kapsamlı döviz kuru servisi eklenebilir
  throw new Error(
    `Para birimi dönüşümü desteklenmiyor: ${discountCurrency} → ${paymentCurrency}`,
  );
}

/**
 * İndirim hesaplama fonksiyonu
 */
export function calculateDiscount(
  params: DiscountCalculationParams,
): DiscountCalculationResult {
  const {
    originalAmount,
    discountType,
    discountValue,
    discountCurrency,
    currencyCode,
    minPurchaseAmount,
    maxDiscountAmount,
  } = params;

  // Minimum tutar kontrolü
  // minPurchaseAmount ve originalAmount ikisi de kuruş cinsinden
  if (minPurchaseAmount && originalAmount < minPurchaseAmount) {
    const minPurchaseAmountInTL = minPurchaseAmount / 100;
    const originalAmountInTL = originalAmount / 100;
    return {
      discountAmount: 0,
      finalAmount: originalAmount,
      originalAmount,
      isValid: false,
      errorMessage: `Minimum alışveriş tutarı ${minPurchaseAmountInTL} ${getCurrencyString(currencyCode)} olmalıdır. Mevcut tutarınız: ${originalAmountInTL.toFixed(2)} ${getCurrencyString(currencyCode)}`,
    };
  }

  let calculatedDiscountAmount = 0;

  if (discountType === 'percentage') {
    // Yüzde indirim hesaplama
    calculatedDiscountAmount = Math.round((originalAmount * discountValue) / 100);

    // Maksimum indirim limiti kontrolü
    // maxDiscountAmount kuruş cinsinden
    if (maxDiscountAmount && calculatedDiscountAmount > maxDiscountAmount) {
      calculatedDiscountAmount = maxDiscountAmount;
    }
  } else if (discountType === 'fixed') {
    // Sabit tutar indirim hesaplama
    // discountValue kuruş cinsinden (veritabanından gelen değer)
    const paymentCurrency = getCurrencyString(currencyCode);
    const discountCurr = discountCurrency || 'TRY';

    try {
      calculatedDiscountAmount = convertFixedDiscountToPaymentCurrency(
        discountValue,
        discountCurr,
        paymentCurrency,
      );
    } catch (error) {
      return {
        discountAmount: 0,
        finalAmount: originalAmount,
        originalAmount,
        isValid: false,
        errorMessage: error instanceof Error ? error.message : 'Para birimi dönüşüm hatası',
      };
    }
  } else {
    return {
      discountAmount: 0,
      finalAmount: originalAmount,
      originalAmount,
      isValid: false,
      errorMessage: 'Geçersiz indirim tipi',
    };
  }

  // İndirim tutarı orijinal tutardan büyük olamaz
  if (calculatedDiscountAmount > originalAmount) {
    calculatedDiscountAmount = originalAmount;
  }

  // Final tutar hesaplama
  const finalAmount = Math.max(0, originalAmount - calculatedDiscountAmount);

  return {
    discountAmount: calculatedDiscountAmount,
    finalAmount,
    originalAmount,
    isValid: true,
  };
}

