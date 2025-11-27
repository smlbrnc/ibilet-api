import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PaymentConfig {
  merchantId: string;
  terminalId: string;
  storeKey: string;
  provisionPassword: string;
  provisionUserId: string;
  terminalUserId: string;
  terminalJwkKeyProvizyon?: string;
  apiVersion: string;
  securityLevel: string;
  baseUrl: string;
  callbackBaseUrl: string;
  successUrl: string;
  errorUrl: string;
}

@Injectable()
export class PaymentConfigService {
  private readonly config: PaymentConfig;

  constructor(private readonly configService: ConfigService) {
    const isProduction = this.configService.get<string>('nodeEnv') === 'production';
    const apiUrl = this.configService.get<string>('apiUrl') || '';

    // Callback URL'lerini API_URL'den oluştur
    const callbackBaseUrl = this.configService.get<string>('payment.callbackBaseUrl') || apiUrl;
    const successUrl = this.configService.get<string>('payment.successUrl') || (apiUrl ? `${apiUrl}/api/payment/callback` : '');
    const errorUrl = this.configService.get<string>('payment.errorUrl') || (apiUrl ? `${apiUrl}/api/payment/callback` : '');

    if (isProduction) {
      this.config = {
        merchantId: this.configService.get<string>('payment.merchantId') || '',
        terminalId: this.configService.get<string>('payment.terminalId') || '',
        storeKey: this.configService.get<string>('payment.storeKey') || '',
        provisionPassword: this.configService.get<string>('payment.provisionPassword') || '',
        provisionUserId: this.configService.get<string>('payment.provisionUserId') || 'PROVAUT',
        terminalUserId: this.configService.get<string>('payment.terminalUserId') || '',
        terminalJwkKeyProvizyon: this.configService.get<string>('payment.terminalJwkKeyProvizyon'),
        apiVersion: '512',
        securityLevel: '3D_PAY',
        baseUrl: 'https://sanalposprov.garanti.com.tr/servlet/gt3dengine',
        callbackBaseUrl,
        successUrl,
        errorUrl,
      };
    } else {
      // Test ortamı
      this.config = {
        merchantId: this.configService.get<string>('payment.testMerchantId') || '',
        terminalId: this.configService.get<string>('payment.testTerminalId') || '',
        storeKey: this.configService.get<string>('payment.testStoreKey') || '',
        provisionPassword: this.configService.get<string>('payment.testProvisionPassword') || '',
        provisionUserId: this.configService.get<string>('payment.testProvisionUserId') || 'PROVAUT',
        terminalUserId: this.configService.get<string>('payment.testTerminalUserId') || '',
        terminalJwkKeyProvizyon: this.configService.get<string>('payment.testTerminalJwkKeyProvizyon'),
        apiVersion: '512',
        securityLevel: '3D_PAY',
        baseUrl: 'https://sanalposprovtest.garantibbva.com.tr/servlet/gt3dengine',
        callbackBaseUrl,
        successUrl,
        errorUrl,
      };
    }

    // Config validation
    this.validateConfig();
  }

  private validateConfig(): void {
    const requiredFields: (keyof PaymentConfig)[] = [
      'merchantId',
      'terminalId',
      'storeKey',
      'provisionPassword',
      'provisionUserId',
      'terminalUserId',
      'baseUrl',
      'successUrl',
      'errorUrl',
    ];

    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!this.config[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw new Error(
        `Payment konfigürasyonu eksik: ${missingFields.join(', ')}. Lütfen environment değişkenlerini kontrol edin.`,
      );
    }
  }

  getConfig(): PaymentConfig {
    return this.config;
  }

  getMerchantId(): string {
    return this.config.merchantId;
  }

  getTerminalId(): string {
    return this.config.terminalId;
  }

  getStoreKey(): string {
    return this.config.storeKey;
  }

  getProvisionPassword(): string {
    return this.config.provisionPassword;
  }

  getProvisionUserId(): string {
    return this.config.provisionUserId;
  }

  getTerminalUserId(): string {
    return this.config.terminalUserId;
  }

  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  getSuccessUrl(): string {
    return this.config.successUrl;
  }

  getErrorUrl(): string {
    return this.config.errorUrl;
  }
}

