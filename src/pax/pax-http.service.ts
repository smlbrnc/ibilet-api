import { Injectable } from '@nestjs/common';
import { TokenManagerService } from './token-manager.service';
import { LoggerService } from '../common/logger/logger.service';

@Injectable()
export class PaxHttpService {
  constructor(
    private readonly tokenManagerService: TokenManagerService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('PaxHttpService');
  }

  private extractUniqueMessages(messages: any[]): string {
    const seen = new Map<string, string>();

    for (const msg of messages) {
      const msgText = (msg.message || msg.code).toString().trim();
      if (!msgText) continue;

      const normalized = msgText.toLowerCase();
      if (!seen.has(normalized)) {
        seen.set(normalized, msgText);
      }
    }

    return Array.from(seen.values()).join('; ');
  }

  /**
   * Token'ı mask'lar (güvenlik için)
   */
  private maskToken(token: string): string {
    if (!token || token.length < 10) return '***';
    return `${token.substring(0, 6)}...${token.substring(token.length - 4)}`;
  }

  /**
   * Response body'yi truncate eder (büyük response'lar için)
   * @param data - Response data
   * @param maxSize - Maksimum boyut (bytes), default 1024 (1KB)
   * @returns Truncate edilmiş veya özet response
   */
  private truncateResponseBody(data: any, maxSize: number = 1024): any {
    if (!data) return data;

    try {
      const dataString = JSON.stringify(data);
      const dataSize = dataString.length;

      // Küçük response'lar için direkt döndür
      if (dataSize <= maxSize) {
        return data;
      }

      // Büyük response'lar için özet oluştur
      const summary: any = {
        _truncated: true,
        _originalSize: dataSize,
        _originalSizeMB: (dataSize / 1024 / 1024).toFixed(2),
      };

      // Header bilgilerini ekle (varsa)
      if (data.header) {
        summary.header = {
          success: data.header.success,
          responseTime: data.header.responseTime,
          messageCount: data.header.messages?.length || 0,
          messages: data.header.messages?.slice(0, 5) || [], // İlk 5 mesaj
        };
      }

      // Body özeti (varsa)
      if (data.body) {
        const bodyString = JSON.stringify(data.body);
        if (bodyString.length > maxSize) {
          summary.body = {
            _preview: bodyString.substring(0, maxSize),
            _truncated: true,
            _size: bodyString.length,
          };
        } else {
          summary.body = data.body;
        }
      }

      // İlk 1KB preview ekle
      summary._preview = dataString.substring(0, maxSize);

      return summary;
    } catch (error) {
      // JSON.stringify başarısız olursa sadece tip bilgisi döndür
      return {
        _truncated: true,
        _error: 'Could not stringify response',
        _type: typeof data,
      };
    }
  }

  async post<T = any>(
    endpoint: string,
    body: any,
    options?: { ip?: string; userId?: string; email?: string },
  ): Promise<T> {
    const startTime = Date.now();
    const requestId = `pax-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
      const token = await this.tokenManagerService.getValidToken();
      const requestBody = JSON.stringify(body);
      const requestHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.maskToken(token)}`, // Token mask'lanmış
      };

      // REQUEST LOG - İstek gönderilmeden önce
      this.logger.log({
        message: 'PAX API REQUEST',
        type: 'PAX_REQUEST',
        requestId,
        endpoint,
        method: 'POST',
        requestBody: JSON.parse(requestBody), // Parse edilmiş body
        requestHeaders,
        ...options,
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // Gerçek token ile istek
        },
        body: requestBody,
      });

      const responseTime = Date.now() - startTime;
      const statusCode = response.status;

      // Response headers'ı al
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorTextSize = errorText.length;
        const maxErrorSize = 2048; // 2KB

        // ERROR RESPONSE LOG
        this.logger.error({
          message: 'PAX API error response',
          type: 'PAX_ERROR_RESPONSE',
          requestId,
          endpoint,
          statusCode,
          responseTime: `${responseTime}ms`,
          responseHeaders,
          errorTextSize,
          // Büyük error text'leri truncate et
          responseBody: errorTextSize > maxErrorSize 
            ? errorText.substring(0, maxErrorSize) + `... [truncated, original size: ${errorTextSize} bytes]`
            : errorText,
          errorMessage: errorTextSize > maxErrorSize
            ? errorText.substring(0, 500) + '... [truncated]'
            : (errorText || `${response.statusText} (${response.status})`),
          ...options,
        });

        throw new Error(errorText || `${response.statusText} (${response.status})`);
      }

      const data = await response.json();

      // Response boyutunu hesapla
      const responseSize = JSON.stringify(data).length;
      const isLargeResponse = responseSize > 1024 * 1024; // 1MB

      // RESPONSE LOG - Başarılı yanıt
      this.logger.log({
        message: 'PAX API response',
        type: 'PAX_RESPONSE',
        requestId,
        endpoint,
        statusCode,
        responseTime: `${responseTime}ms`,
        responseSize,
        responseSizeMB: (responseSize / 1024 / 1024).toFixed(2),
        success: data.header?.success,
        messageCount: data.header?.messages?.length || 0,
        // Büyük response'lar için truncate edilmiş body, küçükler için tam body
        responseBody: isLargeResponse ? this.truncateResponseBody(data) : data,
        ...options,
      });

      if (data.header?.success === false) {
        const errorMessages = this.extractUniqueMessages(data.header.messages || []);
        const timestamp = data.header.responseTime || new Date().toISOString();
        const responseSize = JSON.stringify(data).length;

        this.logger.error({
          message: 'PAX API business error',
          type: 'PAX_BUSINESS_ERROR',
          requestId,
          endpoint,
          statusCode,
          responseTime: `${responseTime}ms`,
          responseSize,
          errorMessages,
          timestamp,
          // Hata durumunda tam body logla (debug için gerekli)
          responseBody: data,
          ...options,
        });

        const error = new Error(errorMessages);
        error.name = 'PAX_BUSINESS_ERROR'; // Error'a özel işaret ekle
        throw error;
      }

      if (data.error || data.errors || data.body?.error || data.body?.errors) {
        const errorData = data.error || data.errors || data.body?.error || data.body?.errors;
        const errorMessage =
          typeof errorData === 'string' ? errorData : JSON.stringify(errorData);
        const responseSize = JSON.stringify(data).length;

        this.logger.error({
          message: 'PAX API response error',
          type: 'PAX_RESPONSE_ERROR',
          requestId,
          endpoint,
          statusCode,
          responseTime: `${responseTime}ms`,
          responseSize,
          errorMessage,
          // Hata durumunda tam body logla (debug için gerekli)
          responseBody: data,
          ...options,
        });

        const error = new Error(errorMessage);
        error.name = 'PAX_RESPONSE_ERROR'; // Error'a özel işaret ekle
        throw error;
      }

      // Büyük response uyarısı (zaten log'da belirtildi, burada tekrar loglamaya gerek yok)
      // Response size zaten yukarıdaki log'da kaydedildi

      return data;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const isProduction = process.env.NODE_ENV === 'production';
      let errorMessage = error instanceof Error ? error.message : String(error);

      // PAX API ön eklerini temizle
      errorMessage = errorMessage.replace(/^PAX API POST isteği başarısız: /, '');
      errorMessage = errorMessage.replace(/^PAX API yanıtında hata: /, '');
      errorMessage = errorMessage.replace(/^PAX API POST Hatası \[.*?\]: /, '');

      // Sadece beklenmeyen hatalar için logla (business/response error'ları zaten loglandı)
      if (error instanceof Error && 
          error.name !== 'PAX_BUSINESS_ERROR' && 
          error.name !== 'PAX_RESPONSE_ERROR') {
        this.logger.error({
          message: 'PAX API unexpected error',
          type: 'PAX_UNEXPECTED_ERROR',
          requestId,
          endpoint,
          responseTime,
          errorMessage,
          // Stack trace sadece development'ta
          ...(isProduction ? {} : { stack: error.stack }),
          ...options,
        });
      }

      throw new Error(errorMessage);
    }
  }
}

