import { Controller, Post, Get, Body, Param, Res, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { PaymentRequestDto } from './dto/payment-request.dto';
import { DirectPaymentRequestDto } from './dto/direct-payment-request.dto';
import { RefundRequestDto } from './dto/refund-request.dto';
import { CallbackRequestDto } from './dto/callback-request.dto';
import { LoggerService } from '../common/logger/logger.service';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly logger: LoggerService,
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
    description: '3D Secure doğrulaması sonrası bankadan dönen callback işler ve kullanıcıyı sonuç sayfasına yönlendirir.',
  })
  @ApiResponse({ status: 302, description: 'Redirect to payment result page' })
  async callback(@Body() dto: CallbackRequestDto, @Res() res: Response) {
    const responseData = await this.paymentService.handleCallback(dto);

    // URL parametrelerini oluştur
    const params = new URLSearchParams({
      status: responseData.success ? 'success' : 'failed',
      orderId: responseData.orderId || '',
      returnCode: responseData.transaction.returnCode || '',
      authCode: responseData.transaction.authCode || '',
      amount: responseData.transaction.amount?.toString() || '',
      currencyCode: responseData.transaction.currencyCode || '',
      message: responseData.transaction.message || '',
      hostRefNum: responseData.paymentDetails.hostRefNum || '',
      maskedPan: responseData.paymentDetails.maskedPan || '',
      cardholderName: responseData.paymentDetails.cardholderName || '',
      timestamp: responseData.timestamp || '',
    });

    // Frontend sonuç sayfasına yönlendir
    const redirectUrl = `/payment-result.html?${params.toString()}`;
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

