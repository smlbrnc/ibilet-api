import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/services/supabase.service';
import { LoggerService } from '../common/logger/logger.service';
import { calculateDiscount } from './utils/discount-calculator.util';

export interface ValidatePromoCodeParams {
  code: string;
  amount: number; // kuruş cinsinden
  currencyCode: string; // '949' = TRY, '978' = EUR, vb.
  userId?: string; // optional - üye olmayan kullanıcılar için boş
}

export interface ValidatePromoCodeResult {
  valid: boolean;
  discount: {
    type: 'percentage' | 'fixed';
    value: number; // TL cinsinden (sabit tutar için) veya yüzde (percentage için)
    currency?: string; // Sabit tutar indirimler için para birimi (TRY, EUR)
    calculatedAmount: number; // kuruş cinsinden indirim tutarı
    finalAmount: number; // kuruş cinsinden final tutar
  };
  code: string;
  message?: string;
  discountId?: string; // user_discount için
  isUserDiscount?: boolean;
}

@Injectable()
export class PromotionService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('PromotionService');
  }

  /**
   * Promosyon kodunu doğrular ve indirim hesaplar
   */
  async validatePromoCode(
    params: ValidatePromoCodeParams,
  ): Promise<ValidatePromoCodeResult> {
    const { code, amount, currencyCode, userId } = params;

    try {
      // Önce kullanıcıya özel indirim kodunu kontrol et (eğer userId varsa)
      if (userId) {
        try {
          const userDiscountResult = await this.validateUserDiscount(code, userId, amount, currencyCode);
          if (userDiscountResult.valid) {
            return userDiscountResult;
          }
          // Valid değilse genel discount'a bak
        } catch (error) {
          // Kullanıcıya özel kod bulunamadı, genel discount'a bakılacak
          this.logger.debug({
            message: 'Kullanıcıya özel promosyon kodu bulunamadı, genel discount kontrol ediliyor',
            code,
            userId,
          });
        }
      }

      // Kullanıcıya özel kod bulunamadıysa veya userId yoksa, genel discount kodunu kontrol et
      return await this.validateGeneralDiscount(code, amount, currencyCode);
    } catch (error) {
      this.logger.error({
        message: 'Promosyon kodu doğrulama hatası',
        code,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        valid: false,
        discount: {
          type: 'percentage',
          value: 0,
          calculatedAmount: 0,
          finalAmount: amount,
        },
        code,
        message: 'Promosyon kodu doğrulanırken hata oluştu',
      };
    }
  }

  /**
   * Kullanıcıya özel indirim kodunu doğrular
   */
  private async validateUserDiscount(
    code: string,
    userId: string,
    amount: number,
    currencyCode: string,
  ): Promise<ValidatePromoCodeResult> {
    const adminClient = this.supabase.getAdminClient();

    const { data, error } = await adminClient
      .from('user_discount')
      .select('*')
      .eq('user_id', userId)
      .eq('code', code.toUpperCase())
      .eq('is_used', false)
      .single();

    if (error || !data) {
      // Kullanıcıya özel kod bulunamadı
      throw new Error('Kullanıcıya özel promosyon kodu bulunamadı');
    }

    // Tarih kontrolü
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      const valueInTL = data.type === 'fixed' ? Number(data.value) / 100 : Number(data.value);
      return {
        valid: false,
        discount: {
          type: data.type as 'percentage' | 'fixed',
          value: valueInTL,
          currency: data.type === 'fixed' ? 'TRY' : undefined,
          calculatedAmount: 0,
          finalAmount: amount,
        },
        code,
        message: 'Promosyon kodunun süresi dolmuş',
        isUserDiscount: true,
      };
    }

    // Kullanım limiti kontrolü (usage_count alanı varsa)
    // TODO: usage_count alanı migration'da eklenecek, şimdilik kontrol edilmiyor

    // İndirim hesaplama
    // NOT: Veritabanındaki değerler kuruş cinsinden
    const calculationResult = calculateDiscount({
      originalAmount: amount, // kuruş cinsinden
      discountType: data.type as 'percentage' | 'fixed',
      discountValue: Number(data.value), // kuruş cinsinden (fixed için) veya yüzde (percentage için)
      discountCurrency: data.type === 'fixed' ? 'TRY' : undefined, // user_discount'ta currency alanı yok, varsayılan TRY
      currencyCode,
      minPurchaseAmount: data.min_purchase_amount ? Number(data.min_purchase_amount) : undefined, // kuruş cinsinden
      maxDiscountAmount: data.max_discount_amount ? Number(data.max_discount_amount) : undefined, // kuruş cinsinden
    });

    if (!calculationResult.isValid) {
      const valueInTL = data.type === 'fixed' ? Number(data.value) / 100 : Number(data.value);
      return {
        valid: false,
        discount: {
          type: data.type as 'percentage' | 'fixed',
          value: valueInTL,
          currency: data.type === 'fixed' ? 'TRY' : undefined,
          calculatedAmount: 0,
          finalAmount: amount,
        },
        code,
        message: calculationResult.errorMessage || 'İndirim hesaplanamadı',
        isUserDiscount: true,
      };
    }

    const valueInTL = data.type === 'fixed' ? Number(data.value) / 100 : Number(data.value);
    return {
      valid: true,
      discount: {
        type: data.type as 'percentage' | 'fixed',
        value: valueInTL,
        currency: data.type === 'fixed' ? 'TRY' : undefined,
        calculatedAmount: calculationResult.discountAmount,
        finalAmount: calculationResult.finalAmount,
      },
      code,
      discountId: data.id,
      isUserDiscount: true,
    };
  }

  /**
   * Genel indirim kodunu doğrular
   */
  private async validateGeneralDiscount(
    code: string,
    amount: number,
    currencyCode: string,
  ): Promise<ValidatePromoCodeResult> {
    const adminClient = this.supabase.getAdminClient();

    const { data, error } = await adminClient
      .from('discount')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return {
        valid: false,
        discount: {
          type: 'percentage',
          value: 0,
          calculatedAmount: 0,
          finalAmount: amount,
        },
        code,
        message: 'Geçersiz promosyon kodu',
      };
    }

    // Tarih kontrolü
    const now = new Date();
    const valueInTL = data.type === 'fixed' ? Number(data.value) / 100 : Number(data.value);
    if (data.start_date && new Date(data.start_date) > now) {
      return {
        valid: false,
        discount: {
          type: data.type as 'percentage' | 'fixed',
          value: valueInTL,
          currency: data.currency || (data.type === 'fixed' ? 'TRY' : undefined),
          calculatedAmount: 0,
          finalAmount: amount,
        },
        code,
        message: 'Promosyon kodu henüz aktif değil',
      };
    }

    if (data.end_date && new Date(data.end_date) < now) {
      return {
        valid: false,
        discount: {
          type: data.type as 'percentage' | 'fixed',
          value: valueInTL,
          currency: data.currency || (data.type === 'fixed' ? 'TRY' : undefined),
          calculatedAmount: 0,
          finalAmount: amount,
        },
        code,
        message: 'Promosyon kodunun süresi dolmuş',
      };
    }

    // Kullanım limiti kontrolü
    if (data.usage_limit && data.used_count >= data.usage_limit) {
      return {
        valid: false,
        discount: {
          type: data.type as 'percentage' | 'fixed',
          value: valueInTL,
          currency: data.currency || (data.type === 'fixed' ? 'TRY' : undefined),
          calculatedAmount: 0,
          finalAmount: amount,
        },
        code,
        message: 'Promosyon kodu kullanım limitine ulaştı',
      };
    }

    // İndirim hesaplama
    // NOT: Veritabanındaki değerler kuruş cinsinden
    const calculationResult = calculateDiscount({
      originalAmount: amount, // kuruş cinsinden
      discountType: data.type as 'percentage' | 'fixed',
      discountValue: Number(data.value), // kuruş cinsinden (fixed için) veya yüzde (percentage için)
      discountCurrency: data.currency || (data.type === 'fixed' ? 'TRY' : undefined),
      currencyCode,
      minPurchaseAmount: data.min_purchase_amount ? Number(data.min_purchase_amount) : undefined, // kuruş cinsinden
      maxDiscountAmount: data.max_discount_amount ? Number(data.max_discount_amount) : undefined, // kuruş cinsinden
    });

    if (!calculationResult.isValid) {
      return {
        valid: false,
        discount: {
          type: data.type as 'percentage' | 'fixed',
          value: valueInTL,
          currency: data.currency || (data.type === 'fixed' ? 'TRY' : undefined),
          calculatedAmount: 0,
          finalAmount: amount,
        },
        code,
        message: calculationResult.errorMessage || 'İndirim hesaplanamadı',
      };
    }

    return {
      valid: true,
      discount: {
        type: data.type as 'percentage' | 'fixed',
        value: valueInTL,
        currency: data.currency || (data.type === 'fixed' ? 'TRY' : undefined),
        calculatedAmount: calculationResult.discountAmount,
        finalAmount: calculationResult.finalAmount,
      },
      code,
      discountId: data.id,
      isUserDiscount: false,
    };
  }

  /**
   * Promosyon kodu kullanımını kaydeder
   */
  async recordPromoCodeUsage(
    code: string,
    discountId: string,
    bookingId: string,
    isUserDiscount: boolean,
    userId?: string,
  ): Promise<void> {
    const adminClient = this.supabase.getAdminClient();

    try {
      if (isUserDiscount && userId) {
        // Kullanıcıya özel indirim kullanımını kaydet
        await adminClient
          .from('user_discount')
          .update({
            is_used: true,
            used_at: new Date().toISOString(),
            used_booking_id: bookingId,
          })
          .eq('id', discountId)
          .eq('user_id', userId);

        this.logger.log({
          message: 'Kullanıcıya özel promosyon kodu kullanımı kaydedildi',
          code,
          discountId,
          bookingId,
        });
      } else {
        // Genel indirim kullanım sayısını artır
        const { data: discount } = await adminClient
          .from('discount')
          .select('used_count')
          .eq('id', discountId)
          .single();

        if (discount) {
          await adminClient
            .from('discount')
            .update({
              used_count: (discount.used_count || 0) + 1,
            })
            .eq('id', discountId);

          this.logger.log({
            message: 'Genel promosyon kodu kullanım sayısı artırıldı',
            code,
            discountId,
            bookingId,
            newCount: (discount.used_count || 0) + 1,
          });
        }
      }
    } catch (error) {
      this.logger.error({
        message: 'Promosyon kodu kullanım kaydı hatası',
        code,
        discountId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Hata olsa bile işlemi durdurmuyoruz (non-critical)
    }
  }
}

