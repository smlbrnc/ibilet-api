import { Controller, Post, Get, Body, Param, Res, HttpStatus, UsePipes, ValidationPipe, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { PaymentRequestDto } from './dto/payment-request.dto';
import { PaymentInitiateRequestDto } from './dto/payment-initiate-request.dto';
import { DirectPaymentRequestDto } from './dto/direct-payment-request.dto';
import { RefundRequestDto } from './dto/refund-request.dto';
import { CallbackRequestDto } from './dto/callback-request.dto';
import { LoggerService } from '../common/logger/logger.service';
import { SupabaseService } from '../common/services/supabase.service';
import { BOOKING_STATUS_MESSAGES, DEFAULT_STATUS_INFO } from './constants/booking-status.constant';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly logger: LoggerService,
    private readonly supabase: SupabaseService,
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
          { success: false, code: 'BOOKING_NOT_FOUND', message: 'Booking bulunamadı' },
          HttpStatus.NOT_FOUND,
        );
      }

      // 2. Status kontrolü
      if (booking.status !== 'AWAITING_PAYMENT') {
        const statusInfo = BOOKING_STATUS_MESSAGES[booking.status] || DEFAULT_STATUS_INFO;
        throw new HttpException(
          { success: false, code: statusInfo.code, message: statusInfo.message, currentStatus: booking.status },
          statusInfo.httpStatus,
        );
      }

      // 3. expires_on kontrolü
      const expiresOn = booking.pre_transactionid?.expires_on;
      if (expiresOn && new Date(expiresOn) <= new Date()) {
        await adminClient
          .schema('backend')
          .from('booking')
          .update({ status: 'EXPIRED', updated_at: new Date().toISOString() })
          .eq('id', booking.id);

        throw new HttpException(
          { success: false, code: 'BOOKING_EXPIRED', message: 'Rezervasyon süresi dolmuş' },
          HttpStatus.BAD_REQUEST,
        );
      }

      // 4. Ödeme başlat
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

      // 5. Başarılı ise booking güncelle
      if (paymentResult.success) {
        const orderId = paymentResult.data?.orderId;

        const { error: updateError } = await adminClient
          .schema('backend')
          .from('booking')
          .update({ status: 'PAYMENT_IN_PROGRESS', order_id: orderId, updated_at: new Date().toISOString() })
          .eq('id', booking.id);

        if (updateError) {
          this.logger.error({ message: 'Booking status güncelleme hatası', error: updateError.message, transactionId: dto.transactionId });
        } else {
          this.logger.log({ message: 'Booking status güncellendi: PAYMENT_IN_PROGRESS', transactionId: dto.transactionId, orderId });
        }
      }

      return { success: true, message: 'Ödeme başlatıldı', data: paymentResult.data };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error({
        message: 'Ödeme başlatma hatası',
        error: error instanceof Error ? error.message : String(error),
        transactionId: dto.transactionId,
      });

      throw new HttpException(
        { success: false, code: 'PAYMENT_INITIATE_ERROR', message: 'Ödeme başlatılamadı' },
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
  @UsePipes(new ValidationPipe({ transform: true, whitelist: false, forbidNonWhitelisted: false }))
  @ApiOperation({
    summary: 'VPOS callback işlemi (Bankadan dönen sonuç)',
    description: '3D Secure doğrulaması sonrası bankadan dönen callback işler, booking status\'unu günceller ve kullanıcıyı sonuç sayfasına yönlendirir.',
  })
  @ApiResponse({ status: 302, description: 'Redirect to payment result page' })
  async callback(@Body() dto: CallbackRequestDto, @Res() res: Response) {
    const result = await this.paymentService.processCallbackWithBooking(dto);
    return res.redirect(result.redirectUrl);
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
