import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '../common/logger/logger.service';
import { PaymentConfigService } from './config/payment-config.service';
import { SupabaseService } from '../common/services/supabase.service';
import { PaxHttpService } from '../pax/pax-http.service';
import { Yolcu360Service } from '../yolcu360/yolcu360.service';
import { PromotionService } from './promotion.service';
import { PaymentRequestDto } from './dto/payment-request.dto';
import { DirectPaymentRequestDto } from './dto/direct-payment-request.dto';
import { RefundRequestDto } from './dto/refund-request.dto';
import { CallbackRequestDto } from './dto/callback-request.dto';
import { generateOrderId, getVposUrl, getTransactionMessage } from './utils/vpos-helpers.util';
import { getHashData as get3DSecureHash } from './utils/vpos-hash.util';
import { getHashData as getDirectHash } from './utils/vpos-hash-direct.util';
import {
  build3DSecureFormData,
  buildDirectPaymentXml,
  parseXmlResponse,
} from './utils/vpos-xml-builder.util';
import {
  format3DSecurePaymentResponse,
  formatDirectPaymentResponse,
  format3DSecureCallbackResponse,
} from './utils/vpos-response-parser.util';

export interface CallbackResult {
  redirectUrl: string;
  success: boolean;
}

@Injectable()
export class PaymentService {
  private readonly isProduction: boolean;

  constructor(
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
    private readonly paymentConfig: PaymentConfigService,
    private readonly configService: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly paxHttp: PaxHttpService,
    private readonly yolcu360Service: Yolcu360Service,
    private readonly promotionService: PromotionService,
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
  ) {
    this.logger.setContext('PaymentService');
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * 3D Secure ödeme işlemi başlatır
   */
  async initiate3DSecurePayment(dto: PaymentRequestDto) {
    try {
      let finalAmount = dto.amount;
      let promoCode = dto.promoCode;
      let promoDiscountAmount = 0;
      let originalAmount = dto.originalAmount || dto.amount;

      // Promosyon kodu varsa doğrula ve indirim hesapla
      if (dto.promoCode) {
        try {
          // Kullanıcı ID'yi email'den bulmaya çalış (opsiyonel)
          let userId: string | undefined;
          if (dto.customerEmail) {
            try {
              const { data: user } = await this.supabase
                .getAdminClient()
                .from('user_profiles')
                .select('id')
                .eq('email', dto.customerEmail)
                .single();
              userId = user?.id;
            } catch {
              // Kullanıcı bulunamadı, devam et
            }
          }

          const validationResult = await this.promotionService.validatePromoCode({
            code: dto.promoCode,
            amount: originalAmount,
            currencyCode: dto.currencyCode || '949',
            userId,
          });

          if (validationResult.valid) {
            finalAmount = validationResult.discount.finalAmount;
            promoDiscountAmount = validationResult.discount.calculatedAmount;
            promoCode = validationResult.code;

            this.logger.log({
              message: 'Promosyon kodu uygulandı',
              code: promoCode,
              originalAmount,
              discountAmount: promoDiscountAmount,
              finalAmount,
            });
          } else {
            throw new BadRequestException(
              validationResult.message || 'Geçersiz promosyon kodu',
            );
          }
        } catch (error) {
          if (error instanceof BadRequestException) {
            throw error;
          }
          this.logger.warn({
            message: 'Promosyon kodu doğrulama hatası, ödeme orijinal tutarla devam ediyor',
            code: dto.promoCode,
            error: error instanceof Error ? error.message : String(error),
          });
          // Hata olsa bile ödemeye devam et (promosyon kodu olmadan)
          promoCode = undefined;
        }
      }

      const orderId = generateOrderId('IB');

      this.logger.log({
        message: 'VPOS payment request initiated',
        orderId,
        amount: finalAmount,
        originalAmount: promoCode ? originalAmount : undefined,
        discountAmount: promoDiscountAmount > 0 ? promoDiscountAmount : undefined,
        promoCode,
        currency: dto.currencyCode,
        customerEmail: dto.customerEmail,
        // cardInfo loglanmıyor (GDPR uyumluluğu)
      });

      // Hash değeri hesapla (installmentCount boş string olmalı, 0 değil!)
      // ÖNEMLİ: Hash hesaplamasında indirimli tutar (finalAmount) kullanılmalı
      const installmentCountForHash = dto.installmentCount || '';
      const hashData = get3DSecureHash({
        terminalId: this.paymentConfig.getTerminalId(),
        orderId,
        amount: finalAmount, // İndirimli tutar kullanılıyor
        currencyCode: dto.currencyCode || '949',
        successUrl: this.paymentConfig.getSuccessUrl(),
        errorUrl: this.paymentConfig.getErrorUrl(),
        type: dto.transactionType,
        installmentCount: installmentCountForHash,
        storeKey: this.paymentConfig.getStoreKey(),
        provisionPassword: this.paymentConfig.getProvisionPassword(),
      });

      // Form verilerini hazırla (installmentCount hash ile aynı olmalı)
      // ÖNEMLİ: Form data'da da indirimli tutar (finalAmount) kullanılmalı
      const formData = build3DSecureFormData({
        orderId,
        hashData,
        paymentConfig: this.paymentConfig.getConfig(),
        amount: finalAmount, // İndirimli tutar kullanılıyor
        transactionType: dto.transactionType,
        currencyCode: dto.currencyCode || '949',
        installmentCount: installmentCountForHash,
        customerEmail: dto.customerEmail,
        customerIp: dto.customerIp,
        companyName: dto.companyName,
        cardInfo: dto.cardInfo,
      });

      this.logger.log({
        message: 'Payment record',
        orderId,
        amount: finalAmount, // İndirimli tutar
        originalAmount: promoCode ? originalAmount : undefined,
        discountAmount: promoDiscountAmount > 0 ? promoDiscountAmount : undefined,
        customerEmail: dto.customerEmail,
      });

      const responseData = format3DSecurePaymentResponse({
        orderId,
        formData,
        redirectUrl: this.paymentConfig.getBaseUrl(),
      });

      this.logger.log({
        message: 'VPOS payment response',
        orderId,
        success: responseData.success,
      });

      return {
        success: true,
        message: 'Ödeme formu başarıyla oluşturuldu',
        data: responseData,
      };
    } catch (error) {
      this.logger.error({
        message: 'Payment initiation error',
        error: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code || 'PAYMENT_INITIATION_ERROR',
        // Stack trace sadece development'ta
        ...(this.isProduction ? {} : { stack: error instanceof Error ? error.stack : undefined }),
      });
      throw new InternalServerErrorException('Ödeme işlemi oluşturulurken hata oluştu');
    }
  }

  /**
   * Direkt ödeme/iade işlemi (3D'siz)
   */
  async processDirectPayment(dto: DirectPaymentRequestDto) {
    try {
      const isRefund = dto.transactionType === 'refund';

      this.logger.log({
        message: `VPOS direct ${isRefund ? 'refund' : 'payment'} request`,
        orderId: isRefund ? dto.orderId : undefined, // Preview için
        amount: dto.amount,
        currency: dto.currencyCode,
        transactionType: dto.transactionType,
        customerEmail: dto.customerEmail,
        // cardInfo loglanmıyor (GDPR uyumluluğu)
      });

      // Sipariş ID - Refund için sağlanmalı, sales için yeni oluşturulmalı
      let orderId: string;
      if (isRefund) {
        if (!dto.orderId) {
          throw new BadRequestException('İade işlemi için orderId gereklidir');
        }
        orderId = dto.orderId;
      } else {
        orderId = generateOrderId('IB_DIRECT');
      }

      // Hash hesapla (3D'siz)
      const hashParams: any = {
        userPassword:
          this.paymentConfig.getTerminalUserId() === 'GARANTI'
            ? 'GARANTI'
            : this.paymentConfig.getProvisionPassword(),
        terminalId: this.paymentConfig.getTerminalId(),
        orderId,
        amount: dto.amount,
        currencyCode: dto.currencyCode || '949',
      };

      // Sales için cardNumber ekle, refund için ekleme
      if (!isRefund && dto.cardInfo) {
        hashParams.cardNumber = dto.cardInfo.cardNumber;
      }

      const hashData = getDirectHash(hashParams);

      // XML isteği oluştur
      const xmlRequest = buildDirectPaymentXml({
        orderId,
        hashData,
        paymentConfig: this.paymentConfig.getConfig(),
        amount: dto.amount,
        transactionType: dto.transactionType || 'sales',
        currencyCode: dto.currencyCode || '949',
        customerEmail: dto.customerEmail,
        customerIp: dto.customerIp,
        cardInfo: dto.cardInfo,
        isRefund,
      });

      this.logger.log('=== XML REQUEST ===');

      // Garanti VPOS API'ye istek gönder
      const response = await firstValueFrom(
        this.httpService.post(getVposUrl(), xmlRequest, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=ISO-8859-9',
          },
          timeout: 30000,
        }),
      );

      // XML yanıtını parse et
      const parsedResponse = await parseXmlResponse(response.data);

      this.logger.log({
        message: 'VPOS response',
        orderId,
        status: parsedResponse?.GVPSResponse?.Transaction?.Response?.Code,
      });

      const gvpsResponse = parsedResponse.GVPSResponse;
      const transaction = gvpsResponse.Transaction;

      // Yanıt verilerini formatla
      const responseData = formatDirectPaymentResponse({
        transaction,
        orderId,
        transactionType: dto.transactionType || 'sales',
        amount: dto.amount,
        currencyCode: dto.currencyCode || '949',
        customerEmail: dto.customerEmail,
        customerIp: dto.customerIp,
        cardInfo: dto.cardInfo,
        isRefund,
      });

      this.logger.log({
        message: `Direct ${isRefund ? 'refund' : 'payment'} result`,
        orderId,
        type: dto.transactionType || 'sales',
        success: responseData.success,
      });

      if (responseData.success) {
        return {
          success: true,
          message: getTransactionMessage(isRefund, true),
          data: responseData,
        };
      } else {
        throw new BadRequestException({
          message: responseData.transaction.message,
          data: responseData,
        });
      }
    } catch (error) {
      this.logger.error({
        message: 'Direct payment processing error',
        error: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code || 'DIRECT_PAYMENT_ERROR',
        // Stack trace sadece development'ta
        ...(this.isProduction ? {} : { stack: error instanceof Error ? error.stack : undefined }),
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: 'İşlem gerçekleştirilemedi',
        error: error.message,
        details: error.response?.data,
      });
    }
  }

  /**
   * İade işlemi
   */
  async processRefund(dto: RefundRequestDto) {
    // processDirectPayment'ı refund modu ile çağır
    return this.processDirectPayment({
      orderId: dto.orderId,
      amount: dto.refundAmount,
      transactionType: 'refund',
      currencyCode: dto.currencyCode || '949',
      customerEmail: dto.customerEmail,
      customerIp: dto.customerIp,
    });
  }

  /**
   * Callback işleme (3D Secure dönüş)
   */
  async handleCallback(dto: CallbackRequestDto) {
    this.logger.log({
      message: 'Garanti callback received',
      orderId: dto.OrderId || dto.orderId,
    });

    // Yanıt verilerini formatla
    const responseData = format3DSecureCallbackResponse(dto);

    if (responseData.success) {
      this.logger.log('✅ Başarılı ödeme - Redirect yapılıyor');
    } else {
      this.logger.warn('❌ Başarısız ödeme - Redirect yapılıyor');
    }

    // Ödeme sonucu log olarak kaydedilecek
    this.logger.log({
      message: 'Payment result',
      orderId: responseData.orderId,
      status: responseData.success ? 'Başarılı' : 'Başarısız',
      returnCode: responseData.transaction.returnCode,
      authCode: responseData.transaction.authCode,
    });

    this.logger.log({
      message: 'Callback response',
      orderId: responseData.orderId,
      success: responseData.success,
    });

    return responseData;
  }

  /**
   * Callback işleme ve booking güncelleme (tüm iş mantığı burada)
   */
  async processCallbackWithBooking(dto: CallbackRequestDto): Promise<CallbackResult> {
    const responseData = await this.handleCallback(dto);

    let transactionId = '';
    let reservationNumber = '';
    let productType = 'flight'; // Default: flight (PAX)

    if (responseData.orderId) {
      try {
        const adminClient = this.supabase.getAdminClient();

        // Booking kaydını bul
        const { data: booking, error: findError } = await adminClient
          .schema('backend')
          .from('booking')
          .select('id, transaction_id, product_type, promo_code, user_id')
          .eq('order_id', responseData.orderId)
          .single();

        if (findError || !booking) {
          this.logger.warn({
            message: 'Callback: Booking bulunamadı',
            orderId: responseData.orderId,
            error: findError?.message,
          });
        } else {
          transactionId = booking.transaction_id;
          productType = booking.product_type || 'flight'; // Product type'ı al

          // Promosyon kodu kullanım kaydı (ödeme başarılı ise)
          if (responseData.success && booking.promo_code) {
            await this.recordPromoCodeUsageAfterPayment(booking, adminClient);
          }

          // Product type kontrolü - Yolcu360 araç mı?
          if (booking.product_type === 'car') {
            reservationNumber = await this.processYolcu360Callback(
              booking,
              responseData,
              adminClient,
            );
          } else {
            // PAX flow
            reservationNumber = await this.processPaxCallback(booking, responseData, adminClient);
          }
        }
      } catch (error) {
        this.logger.error({
          message: 'Callback: Booking güncelleme exception',
          orderId: responseData.orderId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Redirect URL oluştur
    const redirectUrl = this.buildRedirectUrl(
      responseData,
      transactionId,
      reservationNumber,
      productType,
    );
    this.logger.log(`🔄 Redirect URL: ${redirectUrl}`);

    return { redirectUrl, success: responseData.success && !!reservationNumber };
  }

  /**
   * Yolcu360 araç callback işleme
   */
  private async processYolcu360Callback(
    booking: any,
    responseData: any,
    adminClient: any,
  ): Promise<string> {
    let newStatus = responseData.success ? 'SUCCESS' : 'FAILED';
    let findeksCode = null;
    let orderDetails = null;
    let paymentError = null;

    if (responseData.success) {
      // Limit ödeme yap
      const paymentResult = await this.yolcu360Service.processLimitPaymentForCallback(
        booking.transaction_id,
      );

      if (paymentResult.success) {
        findeksCode = paymentResult.findeksCode;
        this.logger.log({
          message: 'Callback: Yolcu360 limit ödeme başarılı',
          transactionId: booking.transaction_id,
          findeksCode,
        });
      } else {
        this.logger.error({
          message: 'Callback: Yolcu360 limit ödeme hatası',
          transactionId: booking.transaction_id,
          error: paymentResult.error,
        });
        newStatus = 'FAILED';
        paymentError = paymentResult.error;
      }

      // Order detaylarını al (hata olsa bile dene)
      try {
        orderDetails = await this.yolcu360Service.getOrderDetails(booking.transaction_id);
        this.logger.log({
          message: 'Callback: Yolcu360 order detayları alındı',
          transactionId: booking.transaction_id,
        });
      } catch (error) {
        this.logger.error({
          message: 'Callback: Yolcu360 order detay hatası',
          transactionId: booking.transaction_id,
          error: error instanceof Error ? error.message : String(error),
        });
        // Order detay hatası status'u değiştirmesin, sadece log
      }
    }

    // Booking'i güncelle (hata bilgisi de dahil)
    const updateData: any = {
      status: newStatus,
      order_detail: responseData,
      booking_number: findeksCode || null,
      booking_detail: orderDetails || null,
      updated_at: new Date().toISOString(),
    };

    // Yolcu30 Limit Ödeme hatası varsa reservation_details'e hata bilgisi ekle
    if (paymentError) {
      updateData.reservation_details = {
        error: paymentError,
        errorType: 'YOLCU360_LIMIT_PAYMENT_ERROR',
        timestamp: new Date().toISOString(),
      };
    }

    // Ödeme hatası varsa ve order detay alınamadıysa, booking_detail'e de hata bilgisi ekle
    if (paymentError && !orderDetails) {
      updateData.booking_detail = {
        error: paymentError,
        timestamp: new Date().toISOString(),
      };
    }

    const { error: updateError } = await adminClient
      .schema('backend')
      .from('booking')
      .update(updateData)
      .eq('id', booking.id);

    if (updateError) {
      this.logger.error({
        message: 'Callback: Yolcu360 booking güncelleme hatası',
        transactionId: booking.transaction_id,
        error: updateError.message,
      });
    } else {
      this.logger.log({
        message: `Callback: Yolcu360 booking güncellendi → ${newStatus}`,
        transactionId: booking.transaction_id,
        findeksCode,
        success: responseData.success,
        hasOrderDetails: !!orderDetails,
        hasPaymentError: !!paymentError,
      });
    }

    // Yolcu360 için: Başarılı ödeme ve status SUCCESS ise transaction_id'yi reservationNumber olarak kullan
    // findeksCode yoksa veya boşsa transaction_id kullanılır
    if (responseData.success && newStatus === 'SUCCESS') {
      return findeksCode || booking.transaction_id;
    }

    return findeksCode || '';
  }

  /**
   * PAX callback işleme (mevcut flow)
   */
  private async processPaxCallback(
    booking: any,
    responseData: any,
    adminClient: any,
  ): Promise<string> {
    let newStatus = responseData.success ? 'SUCCESS' : 'FAILED';
    let bookingDetail = null;
    let reservationDetails = null;
    let reservationNumber = '';

    // Ödeme başarılı ise commit-transaction çağır
    if (responseData.success) {
      const commitResult = await this.commitTransaction(booking.transaction_id);
      bookingDetail = commitResult.bookingDetail;
      newStatus = commitResult.status;
      reservationNumber = commitResult.reservationNumber;

      // Reservation detail al
      if (reservationNumber) {
        reservationDetails = await this.getReservationDetails(reservationNumber);
      }
    }

    // Booking'i güncelle
    const { error: updateError } = await adminClient
      .schema('backend')
      .from('booking')
      .update({
        status: newStatus,
        order_detail: responseData,
        booking_detail: bookingDetail,
        booking_number: reservationNumber || null,
        reservation_details: reservationDetails,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    if (updateError) {
      this.logger.error({
        message: 'Callback: Booking güncelleme hatası',
        orderId: responseData.orderId,
        error: updateError.message,
      });
    } else {
      this.logger.log({
        message: `Callback: Booking güncellendi → ${newStatus}`,
        orderId: responseData.orderId,
        transactionId: booking.transaction_id,
        success: responseData.success,
      });

      // CONFIRMED durumunda bildirim gönder (PDF ile birlikte) - Queue'ya ekle
      if (newStatus === 'CONFIRMED' && reservationDetails) {
        await this.notificationQueue.add('send-booking-confirmation', {
          reservationDetails,
          transactionId: booking.transaction_id,
          reservationNumber,
          bookingId: booking.id,
        });

        this.logger.log({
          message: 'Queue: Bildirim job oluşturuldu',
          transactionId: booking.transaction_id,
          reservationNumber,
        });
      }
    }

    return reservationNumber;
  }

  /**
   * Commit transaction işlemi
   */
  private async commitTransaction(transactionId: string): Promise<{
    status: string;
    reservationNumber: string;
    bookingDetail: any;
  }> {
    try {
      this.logger.log({ message: 'Callback: commit-transaction başlatılıyor', transactionId });

      const baseUrl = this.configService.get<string>('pax.baseUrl');
      const endpoint = this.configService.get<string>('pax.endpoints.commitTransaction');

      const commitResult = await this.paxHttp.post(`${baseUrl}${endpoint}`, { transactionId });

      if (commitResult?.header?.success === true) {
        const reservationNumber = commitResult?.body?.reservationNumber || '';
        this.logger.log({
          message: 'Callback: commit-transaction başarılı',
          transactionId,
          reservationNumber,
        });
        return { status: 'CONFIRMED', reservationNumber, bookingDetail: commitResult };
      }

      const commitError = commitResult?.header?.messages?.[0]?.message || 'Commit işlemi başarısız';
      this.logger.warn({
        message: 'Callback: commit-transaction başarısız',
        transactionId,
        error: commitError,
        response: commitResult,
      });
      return { status: 'COMMIT_ERROR', reservationNumber: '', bookingDetail: commitResult };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error({
        message: 'Callback: commit-transaction hatası',
        transactionId,
        error: errorMessage,
      });
      return {
        status: 'COMMIT_ERROR',
        reservationNumber: '',
        bookingDetail: { error: errorMessage },
      };
    }
  }

  /**
   * Rezervasyon detaylarını al
   */
  private async getReservationDetails(reservationNumber: string): Promise<any> {
    try {
      const baseUrl = this.configService.get<string>('pax.baseUrl');
      const detailEndpoint = this.configService.get<string>('pax.endpoints.reservationDetail');
      const result = await this.paxHttp.post(`${baseUrl}${detailEndpoint}`, {
        ReservationNumber: reservationNumber,
      });
      this.logger.log({ message: 'Callback: reservation-detail alındı', reservationNumber });
      return result;
    } catch (error) {
      this.logger.error({
        message: 'Callback: reservation-detail hatası',
        reservationNumber,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Redirect URL oluştur
   */
  private buildRedirectUrl(
    responseData: any,
    transactionId: string,
    reservationNumber: string,
    productType: string = 'flight',
  ): string {
    // Yolcu360 (car) için: transaction_id zaten reservationNumber olarak kullanılabilir
    // Eğer reservationNumber boşsa ama transactionId varsa ve başarılıysa, transactionId'yi kullan
    const effectiveReservationNumber =
      reservationNumber || (productType === 'car' && responseData.success ? transactionId : '');

    const isFullySuccessful = responseData.success && effectiveReservationNumber;
    const isCommitError = responseData.success && !effectiveReservationNumber;

    let urlStatus = 'failed';
    if (isFullySuccessful) urlStatus = 'success';
    else if (isCommitError) urlStatus = 'commiterror';

    const params = new URLSearchParams({
      status: urlStatus,
      transactionId,
      success: String(isFullySuccessful),
      productType, // Her durumda productType gönder
      ...(isFullySuccessful
        ? { reservationNumber: effectiveReservationNumber }
        : isCommitError
          ? {
              returnCode: responseData.transaction?.returnCode || '',
              error: 'Ödeme başarılı ancak rezervasyon oluşturulamadı',
            }
          : {
              returnCode: responseData.transaction?.returnCode || '',
              message: responseData.transaction?.message || '',
            }),
    });

    const baseRedirectUrl = this.configService.get<string>('payment.redirectUrl');
    return `${baseRedirectUrl}?${params.toString()}`;
  }

  /**
   * Ödeme başarılı olduktan sonra promosyon kodu kullanım kaydı yapar
   */
  private async recordPromoCodeUsageAfterPayment(booking: any, adminClient: any): Promise<void> {
    if (!booking.promo_code) {
      return;
    }

    try {
      // Promosyon kodunu doğrula ve discount ID'yi bul
      const { data: discount } = await adminClient
        .from('discount')
        .select('id')
        .eq('code', booking.promo_code.toUpperCase())
        .single();

      const { data: userDiscount } = booking.user_id
        ? await adminClient
            .from('user_discount')
            .select('id')
            .eq('code', booking.promo_code.toUpperCase())
            .eq('user_id', booking.user_id)
            .single()
        : { data: null };

      const discountId = userDiscount?.id || discount?.id;
      const isUserDiscount = !!userDiscount;

      if (discountId) {
        await this.promotionService.recordPromoCodeUsage(
          booking.promo_code,
          discountId,
          booking.id,
          isUserDiscount,
          booking.user_id,
        );

        this.logger.log({
          message: 'Promosyon kodu kullanım kaydı yapıldı',
          bookingId: booking.id,
          promoCode: booking.promo_code,
          discountId,
          isUserDiscount,
        });
      }
    } catch (error) {
      this.logger.error({
        message: 'Promosyon kodu kullanım kaydı hatası',
        bookingId: booking.id,
        promoCode: booking.promo_code,
        error: error instanceof Error ? error.message : String(error),
      });
      // Hata olsa bile işlemi durdurmuyoruz (non-critical)
    }
  }
}
