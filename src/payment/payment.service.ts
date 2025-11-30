import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '../common/logger/logger.service';
import { PaymentConfigService } from './config/payment-config.service';
import { SupabaseService } from '../common/services/supabase.service';
import { PaxHttpService } from '../pax/pax-http.service';
import { EmailService } from '../email/email.service';
import { NetgsmService } from '../sms/netgsm.service';
import { PdfService } from '../pdf/pdf.service';
import { PaymentRequestDto } from './dto/payment-request.dto';
import { DirectPaymentRequestDto } from './dto/direct-payment-request.dto';
import { RefundRequestDto } from './dto/refund-request.dto';
import { CallbackRequestDto } from './dto/callback-request.dto';
import { generateOrderId, getVposUrl, getTransactionMessage } from './utils/vpos-helpers.util';
import { getHashData as get3DSecureHash } from './utils/vpos-hash.util';
import { getHashData as getDirectHash } from './utils/vpos-hash-direct.util';
import { build3DSecureFormData, buildDirectPaymentXml, parseXmlResponse } from './utils/vpos-xml-builder.util';
import { format3DSecurePaymentResponse, formatDirectPaymentResponse, format3DSecureCallbackResponse } from './utils/vpos-response-parser.util';

export interface CallbackResult {
  redirectUrl: string;
  success: boolean;
}

@Injectable()
export class PaymentService {
  constructor(
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
    private readonly paymentConfig: PaymentConfigService,
    private readonly configService: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly paxHttp: PaxHttpService,
    private readonly emailService: EmailService,
    private readonly netgsmService: NetgsmService,
    private readonly pdfService: PdfService,
  ) {
    this.logger.setContext('PaymentService');
  }

  /**
   * 3D Secure ödeme işlemi başlatır
   */
  async initiate3DSecurePayment(dto: PaymentRequestDto) {
    try {
      this.logger.log('=== VPOS PAYMENT REQUEST ===');
      this.logger.debug(JSON.stringify({ ...dto, cardInfo: dto.cardInfo ? { ...dto.cardInfo, cardNumber: '****', cardCvv2: '***' } : null }));

      const orderId = generateOrderId('IB');

      // Hash değeri hesapla (installmentCount boş string olmalı, 0 değil!)
      const installmentCountForHash = dto.installmentCount || '';
      const hashData = get3DSecureHash({
        terminalId: this.paymentConfig.getTerminalId(),
        orderId,
        amount: dto.amount,
        currencyCode: dto.currencyCode || '949',
        successUrl: this.paymentConfig.getSuccessUrl(),
        errorUrl: this.paymentConfig.getErrorUrl(),
        type: dto.transactionType,
        installmentCount: installmentCountForHash,
        storeKey: this.paymentConfig.getStoreKey(),
        provisionPassword: this.paymentConfig.getProvisionPassword(),
      });

      // Form verilerini hazırla (installmentCount hash ile aynı olmalı)
      const formData = build3DSecureFormData({
        orderId,
        hashData,
        paymentConfig: this.paymentConfig.getConfig(),
        amount: dto.amount,
        transactionType: dto.transactionType,
        currencyCode: dto.currencyCode || '949',
        installmentCount: installmentCountForHash,
        customerEmail: dto.customerEmail,
        customerIp: dto.customerIp,
        companyName: dto.companyName,
        cardInfo: dto.cardInfo,
      });

      this.logger.log('=== ÖDEME KAYDI ===');
      this.logger.log(JSON.stringify({ orderId, amount: dto.amount, customerEmail: dto.customerEmail }));

      const responseData = format3DSecurePaymentResponse({
        orderId,
        formData,
        redirectUrl: this.paymentConfig.getBaseUrl(),
      });

      this.logger.log('=== VPOS PAYMENT RESPONSE ===');
      this.logger.debug(JSON.stringify({ responseData }));

      return {
        success: true,
        message: 'Ödeme formu başarıyla oluşturuldu',
        data: responseData,
      };
    } catch (error) {
      this.logger.error(JSON.stringify({ error: error.message, stack: error.stack }));
      throw new InternalServerErrorException('Ödeme işlemi oluşturulurken hata oluştu');
    }
  }

  /**
   * Direkt ödeme/iade işlemi (3D'siz)
   */
  async processDirectPayment(dto: DirectPaymentRequestDto) {
    try {
      const isRefund = dto.transactionType === 'refund';

      this.logger.log(`=== VPOS DIRECT ${isRefund ? 'REFUND' : 'PAYMENT'} REQUEST (3D'siz) ===`);
      this.logger.debug(JSON.stringify({
        ...dto,
        cardInfo: dto.cardInfo ? { ...dto.cardInfo, cardNumber: '****', cardCvv2: '***' } : null,
      }));

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
        userPassword: this.paymentConfig.getTerminalUserId() === 'GARANTI' ? 'GARANTI' : this.paymentConfig.getProvisionPassword(),
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

      this.logger.log('=== VPOS RESPONSE ===');
      this.logger.debug(JSON.stringify(parsedResponse, null, 2));

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

      this.logger.log(`=== DIRECT ${isRefund ? 'REFUND' : 'PAYMENT'} RESULT ===`);
      this.logger.log(JSON.stringify({
        orderId,
        type: dto.transactionType || 'sales',
        success: responseData.success,
      }));

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
      this.logger.error(JSON.stringify({
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
      }));

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
    this.logger.log('=== GARANTI CALLBACK ===');
    this.logger.debug(JSON.stringify({ body: dto }));

    // Yanıt verilerini formatla
    const responseData = format3DSecureCallbackResponse(dto);

    if (responseData.success) {
      this.logger.log('✅ Başarılı ödeme - Redirect yapılıyor');
    } else {
      this.logger.warn('❌ Başarısız ödeme - Redirect yapılıyor');
    }

    // Ödeme sonucu log olarak kaydedilecek
    this.logger.log('=== ÖDEME SONUCU ===');
    this.logger.log(JSON.stringify({
      orderId: responseData.orderId,
      status: responseData.success ? 'Başarılı' : 'Başarısız',
      returnCode: responseData.transaction.returnCode,
      authCode: responseData.transaction.authCode,
    }));

    this.logger.log('=== CALLBACK RESPONSE ===');
    this.logger.debug(JSON.stringify({ responseData }));

    return responseData;
  }

  /**
   * İşlem durumu sorgulama
   */
  async getTransactionStatus(orderId: string) {
    try {
      this.logger.log('=== VPOS TRANSACTION STATUS REQUEST ===');
      this.logger.debug(`Order ID: ${orderId}`);

      // TODO: Garanti VPOS API'den inquiry XML request oluştur ve gönder
      // Inquiry için özel hash hesaplama ve XML builder gerekli
      // Şimdilik placeholder response döndürüyoruz

      throw new BadRequestException('İşlem durumu sorgulama henüz implement edilmedi');
    } catch (error) {
      this.logger.error(JSON.stringify({
        error: error.message,
        stack: error.stack,
      }));

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException('İşlem durumu sorgulanamadı');
    }
  }

  /**
   * Callback işleme ve booking güncelleme (tüm iş mantığı burada)
   */
  async processCallbackWithBooking(dto: CallbackRequestDto): Promise<CallbackResult> {
    const responseData = await this.handleCallback(dto);

    let transactionId = '';
    let reservationNumber = '';

    if (responseData.orderId) {
      try {
        const adminClient = this.supabase.getAdminClient();

        const { data: booking, error: findError } = await adminClient
          .schema('backend')
          .from('booking')
          .select('id, transaction_id')
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

          let newStatus = responseData.success ? 'SUCCESS' : 'FAILED';
          let bookingDetail = null;
          let reservationDetails = null;

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

            // CONFIRMED durumunda bildirim gönder (PDF ile birlikte)
            if (newStatus === 'CONFIRMED' && reservationDetails) {
              this.sendNotifications(reservationDetails, booking.transaction_id, reservationNumber, booking.id).catch((error) => {
                this.logger.error({
                  message: 'Callback: Bildirim gönderme hatası',
                  transactionId: booking.transaction_id,
                  error: error instanceof Error ? error.message : String(error),
                });
              });
            }
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
    const redirectUrl = this.buildRedirectUrl(responseData, transactionId, reservationNumber);
    this.logger.log(`🔄 Redirect URL: ${redirectUrl}`);

    return { redirectUrl, success: responseData.success && !!reservationNumber };
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
        this.logger.log({ message: 'Callback: commit-transaction başarılı', transactionId, reservationNumber });
        return { status: 'CONFIRMED', reservationNumber, bookingDetail: commitResult };
      }

      const commitError = commitResult?.header?.messages?.[0]?.message || 'Commit işlemi başarısız';
      this.logger.warn({ message: 'Callback: commit-transaction başarısız', transactionId, response: commitResult });
      return { status: 'COMMIT_ERROR', reservationNumber: '', bookingDetail: commitResult };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error({ message: 'Callback: commit-transaction hatası', transactionId, error: errorMessage });
      return { status: 'COMMIT_ERROR', reservationNumber: '', bookingDetail: { error: errorMessage } };
    }
  }

  /**
   * Rezervasyon detaylarını al
   */
  private async getReservationDetails(reservationNumber: string): Promise<any> {
    try {
      const baseUrl = this.configService.get<string>('pax.baseUrl');
      const detailEndpoint = this.configService.get<string>('pax.endpoints.reservationDetail');
      const result = await this.paxHttp.post(`${baseUrl}${detailEndpoint}`, { ReservationNumber: reservationNumber });
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
   * Email ve SMS bildirimlerini gönder (PDF ile birlikte)
   */
  private async sendNotifications(
    reservationDetails: any,
    transactionId: string,
    reservationNumber: string,
    bookingId?: string,
  ): Promise<void> {
    try {
      // PDF oluştur (await)
      let pdfBuffer: Buffer | undefined;
      let pdfFilename: string | undefined;

      try {
        const pdfResult = await this.pdfService.generateBookingPdf(reservationDetails, reservationNumber);
        pdfBuffer = pdfResult.buffer;
        pdfFilename = `booking-${reservationNumber}.pdf`;

        // PDF'i dosya sistemine kaydet
        await this.pdfService.savePdfToFileSystem(pdfResult.buffer, pdfResult.filePath);

        // PDF yolunu booking tablosuna kaydet
        if (bookingId) {
          const adminClient = this.supabase.getAdminClient();
          await adminClient
            .schema('backend')
            .from('booking')
            .update({ pdf_path: pdfResult.filePath, updated_at: new Date().toISOString() })
            .eq('id', bookingId);
        }

        this.logger.log({ message: 'Callback: PDF oluşturuldu', transactionId, reservationNumber });
      } catch (pdfError) {
        const pdfErrorMessage = pdfError instanceof Error ? pdfError.message : String(pdfError);
        this.logger.error({ message: 'Callback: PDF oluşturma hatası', transactionId, error: pdfErrorMessage });
        // PDF hatası email gönderimini engellemez
      }

      // Email gönder (PDF attachment ile, await)
      const emailPromise = this.emailService
        .sendBookingConfirmation(reservationDetails, transactionId, pdfBuffer, pdfFilename)
        .then((result) => {
          if (result.success) {
            this.logger.log({ message: 'Callback: Rezervasyon onay emaili gönderildi', transactionId, reservationNumber });
          } else {
            this.logger.error({ message: 'Callback: Rezervasyon onay emaili gönderilemedi', transactionId, error: result.message });
          }
          return result;
        })
        .catch((error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error({ message: 'Callback: Rezervasyon onay emaili gönderme hatası', transactionId, error: errorMessage });
          return { success: false, message: errorMessage };
        });

      // SMS gönder (paralel)
      const smsPromise = this.netgsmService
        .sendBookingConfirmation(reservationDetails, transactionId)
        .then((result) => {
          if (result.success) {
            this.logger.log({ message: 'Callback: Rezervasyon onay SMS gönderildi', transactionId, reservationNumber });
          } else {
            this.logger.error({ message: 'Callback: Rezervasyon onay SMS gönderilemedi', transactionId, error: result.message });
          }
          return result;
        })
        .catch((error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error({ message: 'Callback: Rezervasyon onay SMS gönderme hatası', transactionId, error: errorMessage });
          return { success: false, message: errorMessage };
        });

      // Email ve SMS'i paralel bekle
      await Promise.allSettled([emailPromise, smsPromise]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error({ message: 'Callback: Bildirim gönderme hatası', transactionId, error: errorMessage });
    }
  }

  /**
   * Redirect URL oluştur
   */
  private buildRedirectUrl(responseData: any, transactionId: string, reservationNumber: string): string {
    const isFullySuccessful = responseData.success && reservationNumber;
    const isCommitError = responseData.success && !reservationNumber;

    let urlStatus = 'failed';
    if (isFullySuccessful) urlStatus = 'success';
    else if (isCommitError) urlStatus = 'commiterror';

    const params = new URLSearchParams({
      status: urlStatus,
      transactionId,
      success: String(isFullySuccessful),
      ...(isFullySuccessful
        ? { reservationNumber }
        : isCommitError
          ? { returnCode: responseData.transaction?.returnCode || '', reservationNumber: 'Ödeme başarılı ancak rezervasyon oluşturulamadı' }
          : { returnCode: responseData.transaction?.returnCode || '', message: responseData.transaction?.message || '' }),
    });

    const baseRedirectUrl = this.configService.get<string>('payment.redirectUrl');
    return `${baseRedirectUrl}?${params.toString()}`;
  }
}

