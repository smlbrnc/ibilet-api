import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '../common/logger/logger.service';
import { PaymentConfigService } from './config/payment-config.service';
import { PaymentRequestDto } from './dto/payment-request.dto';
import { DirectPaymentRequestDto } from './dto/direct-payment-request.dto';
import { RefundRequestDto } from './dto/refund-request.dto';
import { CallbackRequestDto } from './dto/callback-request.dto';
import { generateOrderId, getVposUrl, getTransactionMessage } from './utils/vpos-helpers.util';
import { getHashData as get3DSecureHash } from './utils/vpos-hash.util';
import { getHashData as getDirectHash } from './utils/vpos-hash-direct.util';
import { build3DSecureFormData, buildDirectPaymentXml, parseXmlResponse } from './utils/vpos-xml-builder.util';
import { format3DSecurePaymentResponse, formatDirectPaymentResponse, format3DSecureCallbackResponse } from './utils/vpos-response-parser.util';

@Injectable()
export class PaymentService {
  private readonly logger: LoggerService;

  constructor(
    private readonly httpService: HttpService,
    private readonly loggerService: LoggerService,
    private readonly paymentConfig: PaymentConfigService,
  ) {
    this.logger = loggerService;
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
    try {
      this.logger.log("=== VPOS REFUND REQUEST (3D'siz) ===");
      this.logger.debug(JSON.stringify({ body: dto }));

      // Hash hesapla (refund için - cardNumber YOK)
      const hashParams = {
        userPassword: this.paymentConfig.getTerminalUserId() === 'GARANTI' ? 'GARANTI' : this.paymentConfig.getProvisionPassword(),
        terminalId: this.paymentConfig.getTerminalId(),
        orderId: dto.orderId,
        amount: dto.refundAmount,
        currencyCode: dto.currencyCode || '949',
      };

      const hashData = getDirectHash(hashParams);

      // XML isteği oluştur
      const xmlRequest = buildDirectPaymentXml({
        orderId: dto.orderId,
        hashData,
        paymentConfig: this.paymentConfig.getConfig(),
        amount: dto.refundAmount,
        transactionType: 'refund',
        currencyCode: dto.currencyCode || '949',
        customerEmail: dto.customerEmail,
        customerIp: dto.customerIp,
        cardInfo: null,
        isRefund: true,
        provUserID: 'PROVRFN',
      });

      this.logger.log('=== XML REFUND REQUEST ===');
      this.logger.debug(xmlRequest);

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

      this.logger.log('=== VPOS REFUND RESPONSE ===');
      this.logger.debug(JSON.stringify(parsedResponse, null, 2));

      const gvpsResponse = parsedResponse.GVPSResponse;
      const transaction = gvpsResponse.Transaction;

      // Yanıt verilerini formatla
      const responseData = formatDirectPaymentResponse({
        transaction,
        orderId: dto.orderId,
        transactionType: 'refund',
        amount: dto.refundAmount,
        currencyCode: dto.currencyCode || '949',
        customerEmail: dto.customerEmail,
        customerIp: dto.customerIp,
        cardInfo: null,
        isRefund: true,
      });

      this.logger.log('=== REFUND RESULT ===');
      this.logger.log(JSON.stringify({
        orderId: dto.orderId,
        refundAmount: dto.refundAmount,
        success: responseData.success,
        returnCode: responseData.transaction.returnCode,
      }));

      if (responseData.success) {
        return {
          success: true,
          message: 'İade işlemi başarıyla tamamlandı',
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
        message: 'İade işlemi gerçekleştirilemedi',
        error: error.message,
        details: error.response?.data,
      });
    }
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
}

