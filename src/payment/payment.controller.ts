import { Controller, Post, Get, Body, Param, Res, HttpStatus, UsePipes, ValidationPipe, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { PaymentRequestDto } from './dto/payment-request.dto';
import { PaymentInitiateRequestDto } from './dto/payment-initiate-request.dto';
import { DirectPaymentRequestDto } from './dto/direct-payment-request.dto';
import { RefundRequestDto } from './dto/refund-request.dto';
import { CallbackRequestDto } from './dto/callback-request.dto';
import { LoggerService } from '../common/logger/logger.service';
import { SupabaseService } from '../common/services/supabase.service';
import { PaxHttpService } from '../pax/pax-http.service';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly logger: LoggerService,
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
    private readonly paxHttp: PaxHttpService,
  ) {
    this.logger.setContext('PaymentController');
  }

  @Post()
  @ApiOperation({ summary: '3D Secure ile ödeme işlemi başlatma' })
  @ApiResponse({ status: 200, description: 'Ödeme formu başarıyla oluşturuldu' })
  @ApiResponse({ status: 400, description: 'Validation hatası' })
  @ApiResponse({ status: 500, description: 'Sunucu hatası' })
  async initiatePayment(@Body() dto: PaymentRequestDto) {
    return this.paymentService.initiate3DSecurePayment(dto);
  }

  @Post('initiate')
  @ApiOperation({
    summary: 'Booking için ödeme başlat (3D Secure)',
    description: 'AWAITING_PAYMENT durumundaki booking için ödeme başlatır ve status\'u PAYMENT_IN_PROGRESS olarak günceller.',
  })
  @ApiResponse({ status: 200, description: 'Ödeme başlatıldı' })
  @ApiResponse({ status: 400, description: 'Rezervasyon süresi dolmuş veya validation hatası' })
  @ApiResponse({ status: 404, description: 'Booking bulunamadı' })
  @ApiResponse({ status: 409, description: 'Bu rezervasyon için ödeme zaten başlatılmış' })
  @ApiResponse({ status: 500, description: 'Sunucu hatası' })
  async initiateBookingPayment(@Body() dto: PaymentInitiateRequestDto) {
    try {
      const adminClient = this.supabase.getAdminClient();

      // 1. transaction_id ile booking kaydını bul
      const { data: booking, error: bookingError } = await adminClient
        .schema('backend')
        .from('booking')
        .select('*, pre_transactionid:pre_transaction_id(expires_on)')
        .eq('transaction_id', dto.transactionId)
        .single();

      if (bookingError || !booking) {
        throw new HttpException(
          {
            success: false,
            code: 'BOOKING_NOT_FOUND',
            message: 'Booking bulunamadı',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // 2. Status kontrolü - AWAITING_PAYMENT değilse uygun hata döndür
      if (booking.status !== 'AWAITING_PAYMENT') {
        const statusMessages: Record<string, { code: string; message: string; httpStatus: HttpStatus }> = {
          'PAYMENT_IN_PROGRESS': {
            code: 'PAYMENT_ALREADY_INITIATED',
            message: 'Bu rezervasyon için ödeme zaten başlatılmış',
            httpStatus: HttpStatus.CONFLICT,
          },
          'EXPIRED': {
            code: 'BOOKING_EXPIRED',
            message: 'Rezervasyon süresi dolmuş',
            httpStatus: HttpStatus.BAD_REQUEST,
          },
          'FAILED': {
            code: 'PAYMENT_FAILED',
            message: 'Bu rezervasyon için ödeme başarısız oldu',
            httpStatus: HttpStatus.BAD_REQUEST,
          },
          'SUCCESS': {
            code: 'PAYMENT_COMPLETED',
            message: 'Bu rezervasyon için ödeme zaten tamamlanmış',
            httpStatus: HttpStatus.CONFLICT,
          },
          'CONFIRMED': {
            code: 'BOOKING_CONFIRMED',
            message: 'Bu rezervasyon zaten onaylanmış',
            httpStatus: HttpStatus.CONFLICT,
          },
          'COMMIT_FAILED': {
            code: 'COMMIT_FAILED',
            message: 'Rezervasyon onaylaması başarısız oldu',
            httpStatus: HttpStatus.BAD_REQUEST,
          },
          'REFUND_PENDING': {
            code: 'REFUND_PENDING',
            message: 'Bu rezervasyon için iade işlemi beklemede',
            httpStatus: HttpStatus.CONFLICT,
          },
          'REFUNDED': {
            code: 'BOOKING_REFUNDED',
            message: 'Bu rezervasyon için iade yapılmış',
            httpStatus: HttpStatus.CONFLICT,
          },
          'CANCELLED': {
            code: 'BOOKING_CANCELLED',
            message: 'Bu rezervasyon iptal edilmiş',
            httpStatus: HttpStatus.BAD_REQUEST,
          },
        };

        const statusInfo = statusMessages[booking.status] || {
          code: 'INVALID_BOOKING_STATUS',
          message: 'Rezervasyon durumu ödeme başlatmaya uygun değil',
          httpStatus: HttpStatus.BAD_REQUEST,
        };

        throw new HttpException(
          {
            success: false,
            code: statusInfo.code,
            message: statusInfo.message,
            currentStatus: booking.status,
          },
          statusInfo.httpStatus,
        );
      }

      // 3. expires_on kontrolü
      const expiresOn = booking.pre_transactionid?.expires_on;
      if (expiresOn) {
        const expiresOnDate = new Date(expiresOn);
        if (expiresOnDate <= new Date()) {
          // Booking status'unu EXPIRED olarak güncelle
          await adminClient
            .schema('backend')
            .from('booking')
            .update({ status: 'EXPIRED', updated_at: new Date().toISOString() })
            .eq('id', booking.id);

          throw new HttpException(
            {
              success: false,
              code: 'BOOKING_EXPIRED',
              message: 'Rezervasyon süresi dolmuş',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // 4. PaymentRequestDto'ya dönüştür ve ödeme başlat (sabit değerlerle)
      const paymentDto: PaymentRequestDto = {
        amount: dto.amount,
        currencyCode: dto.currencyCode || '949',
        transactionType: 'sales',
        installmentCount: 0,
        customerEmail: dto.customerEmail,
        customerIp: dto.customerIp,
        companyName: 'IBGROUP',
        cardInfo: dto.cardInfo,
      };

      const paymentResult = await this.paymentService.initiate3DSecurePayment(paymentDto);

      // 5. Ödeme başarılı ise booking status'unu PAYMENT_IN_PROGRESS olarak güncelle ve order_id kaydet
      if (paymentResult.success) {
        const orderId = paymentResult.data?.orderId;
        
        const { error: updateError } = await adminClient
          .schema('backend')
          .from('booking')
          .update({ 
            status: 'PAYMENT_IN_PROGRESS', 
            order_id: orderId,
            updated_at: new Date().toISOString() 
          })
          .eq('id', booking.id);

        if (updateError) {
          this.logger.error({
            message: 'Booking status güncelleme hatası',
            error: updateError.message,
            transactionId: dto.transactionId,
          });
        } else {
          this.logger.log({
            message: 'Booking status güncellendi: PAYMENT_IN_PROGRESS',
            transactionId: dto.transactionId,
            orderId,
          });
        }
      }

      return {
        success: true,
        message: 'Ödeme başlatıldı',
        data: paymentResult.data,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error({
        message: 'Ödeme başlatma hatası',
        error: error instanceof Error ? error.message : String(error),
        transactionId: dto.transactionId,
      });

      throw new HttpException(
        {
          success: false,
          code: 'PAYMENT_INITIATE_ERROR',
          message: 'Ödeme başlatılamadı',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('direct')
  @ApiOperation({
    summary: 'Direkt ödeme/iade işlemi (3D Secure olmadan)',
    description: 'Tek endpoint ile hem ödeme (sales) hem de iade (refund) işlemleri yapılabilir.',
  })
  @ApiResponse({ status: 200, description: 'İşlem başarıyla tamamlandı' })
  @ApiResponse({ status: 400, description: 'Validation hatası veya işlem başarısız' })
  @ApiResponse({ status: 500, description: 'Sunucu hatası' })
  async directPayment(@Body() dto: DirectPaymentRequestDto) {
    return this.paymentService.processDirectPayment(dto);
  }

  @Post('refund')
  @ApiOperation({
    summary: 'İade işlemi (3D Secure olmadan)',
    description: 'Daha önce yapılmış bir ödeme işlemine tam veya kısmi iade yapar.',
  })
  @ApiResponse({ status: 200, description: 'İade işlemi başarılı' })
  @ApiResponse({ status: 400, description: 'Validation hatası veya işlem başarısız' })
  @ApiResponse({ status: 500, description: 'Sunucu hatası' })
  async refund(@Body() dto: RefundRequestDto) {
    return this.paymentService.processRefund(dto);
  }

  @Post('callback')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: false, // Callback için tüm alanları kabul et
      forbidNonWhitelisted: false, // Ekstra alanları reddetme
    }),
  )
  @ApiOperation({
    summary: 'VPOS callback işlemi (Bankadan dönen sonuç)',
    description: '3D Secure doğrulaması sonrası bankadan dönen callback işler, booking status\'unu günceller ve kullanıcıyı sonuç sayfasına yönlendirir.',
  })
  @ApiResponse({ status: 302, description: 'Redirect to payment result page' })
  async callback(@Body() dto: CallbackRequestDto, @Res() res: Response) {
    const responseData = await this.paymentService.handleCallback(dto);

    // URL parametreleri için değişkenler
    let transactionId = '';
    let reservationNumber = '';

    // Booking güncelle (orderId ile)
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

          // Her durumda order_detail'e ödeme sonucunu kaydet
          let newStatus = responseData.success ? 'SUCCESS' : 'FAILED';
          let bookingDetail = null;

          // Ödeme başarılı ise commit-transaction çağır
          if (responseData.success) {
            try {
              this.logger.log({
                message: 'Callback: commit-transaction başlatılıyor',
                transactionId: booking.transaction_id,
              });

              const baseUrl = this.configService.get<string>('pax.baseUrl');
              const endpoint = this.configService.get<string>('pax.endpoints.commitTransaction');
              
              const commitResult = await this.paxHttp.post(`${baseUrl}${endpoint}`, {
                transactionId: booking.transaction_id,
              });

              bookingDetail = commitResult;

              // Commit başarılı mı kontrol et
              if (commitResult?.header?.success === true) {
                newStatus = 'CONFIRMED';
                reservationNumber = commitResult?.body?.reservationNumber || '';
                this.logger.log({
                  message: 'Callback: commit-transaction başarılı',
                  transactionId: booking.transaction_id,
                  reservationNumber,
                });
              } else {
                newStatus = 'COMMIT_FAILED';
                this.logger.warn({
                  message: 'Callback: commit-transaction başarısız',
                  transactionId: booking.transaction_id,
                  response: commitResult,
                });
              }
            } catch (commitError) {
              newStatus = 'COMMIT_FAILED';
              bookingDetail = { error: commitError instanceof Error ? commitError.message : String(commitError) };
              this.logger.error({
                message: 'Callback: commit-transaction hatası',
                transactionId: booking.transaction_id,
                error: commitError instanceof Error ? commitError.message : String(commitError),
              });
            }
          }

          // Booking'i güncelle (order_detail ve booking_detail ile birlikte)
          const { error: updateError } = await adminClient
            .schema('backend')
            .from('booking')
            .update({
              status: newStatus,
              order_detail: responseData,
              booking_detail: bookingDetail,
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

    // URL parametrelerini oluştur (başarı/hata durumuna göre)
    const params = new URLSearchParams({
      status: responseData.success ? 'success' : 'failed',
      transactionId,
      success: String(responseData.success),
      ...(responseData.success
        ? { reservationNumber }
        : {
            returnCode: responseData.transaction?.returnCode || '',
            message: responseData.transaction?.message || '',
          }),
    });

    // Frontend sonuç sayfasına yönlendir (mobil ve web için)
    const baseRedirectUrl = this.configService.get<string>('payment.redirectUrl');
    const redirectUrl = `${baseRedirectUrl}?${params.toString()}`;
    this.logger.log(`🔄 Redirect URL: ${redirectUrl}`);

    return res.redirect(redirectUrl);
  }

  @Get('status/:orderId')
  @ApiOperation({
    summary: 'İşlem durumu sorgulama',
    description: 'Belirli bir siparişin durumunu Garanti VPOS API üzerinden sorgular.',
  })
  @ApiParam({ name: 'orderId', description: 'Sipariş ID' })
  @ApiResponse({ status: 200, description: 'İşlem durumu başarıyla getirildi' })
  @ApiResponse({ status: 400, description: 'Validation hatası' })
  @ApiResponse({ status: 404, description: 'İşlem bulunamadı' })
  @ApiResponse({ status: 500, description: 'Sunucu hatası' })
  async getStatus(@Param('orderId') orderId: string) {
    return this.paymentService.getTransactionStatus(orderId);
  }
}

