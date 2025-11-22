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

        // ERROR RESPONSE LOG
        this.logger.error({
          message: 'PAX API ERROR RESPONSE',
          type: 'PAX_ERROR_RESPONSE',
          requestId,
          endpoint,
          statusCode,
          responseTime,
          responseHeaders,
          responseBody: errorText,
          errorMessage: errorText || `${response.statusText} (${response.status})`,
          ...options,
        });

        throw new Error(errorText || `${response.statusText} (${response.status})`);
      }

      const data = await response.json();

      // RESPONSE LOG - Başarılı yanıt
      this.logger.log({
        message: 'PAX API RESPONSE',
        type: 'PAX_RESPONSE',
        requestId,
        endpoint,
        statusCode,
        responseTime,
        responseHeaders,
        responseBody: data, // Tam response body
        ...options,
      });

      if (data.header?.success === false) {
        const errorMessages = this.extractUniqueMessages(data.header.messages || []);
        const timestamp = data.header.responseTime || new Date().toISOString();

        this.logger.error({
          message: 'PAX API BUSINESS ERROR',
          type: 'PAX_BUSINESS_ERROR',
          requestId,
          endpoint,
          statusCode,
          responseTime,
          errorMessages,
          timestamp,
          responseBody: data,
          ...options,
        });

        throw new Error(errorMessages);
      }

      if (data.error || data.errors || data.body?.error || data.body?.errors) {
        const errorData = data.error || data.errors || data.body?.error || data.body?.errors;
        const errorMessage =
          typeof errorData === 'string' ? errorData : JSON.stringify(errorData);

        this.logger.error({
          message: 'PAX API RESPONSE ERROR',
          type: 'PAX_RESPONSE_ERROR',
          requestId,
          endpoint,
          statusCode,
          responseTime,
          errorMessage,
          responseBody: data,
          ...options,
        });

        throw new Error(errorMessage);
      }

      const responseSize = JSON.stringify(data).length;
      if (responseSize > 1024 * 1024) {
        this.logger.warn({
          message: `Large PAX response: ${(responseSize / 1024 / 1024).toFixed(2)} MB from ${endpoint}`,
          requestId,
          endpoint,
          responseSize,
          responseTime,
        });
      }

      return data;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      let errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      // PAX API ön eklerini temizle
      errorMessage = errorMessage.replace(/^PAX API POST isteği başarısız: /, '');
      errorMessage = errorMessage.replace(/^PAX API yanıtında hata: /, '');
      errorMessage = errorMessage.replace(/^PAX API POST Hatası \[.*?\]: /, '');

      // Beklenmeyen hatalar için (token hatası, network hatası vb.)
      if (!errorMessage.includes('PAX API')) {
        this.logger.error({
          message: 'PAX API UNEXPECTED ERROR',
          type: 'PAX_UNEXPECTED_ERROR',
          requestId,
          endpoint,
          responseTime,
          errorMessage,
          errorStack,
          ...options,
        });
      }

      throw new Error(errorMessage);
    }
  }
}

