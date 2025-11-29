import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendSmsDto } from './dto/send-sms.dto';
import { GetBalanceDto } from './dto/get-balance.dto';
import { LoggerService } from '../common/logger/logger.service';

@Injectable()
export class NetgsmService {
  private readonly baseUrl = 'https://api.netgsm.com.tr/sms/send/get';
  private readonly balanceUrl = 'https://api.netgsm.com.tr/balance';

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('NetgsmService');
  }

  private getSuccessMessage(code: string): string {
    const messages: Record<string, string> = {
      '00': 'SMS başarıyla gönderildi',
      '01': 'SMS başarıyla gönderildi (tarih düzeltildi)',
      '02': 'SMS başarıyla gönderildi (bitiş tarihi düzeltildi)',
    };
    return messages[code] || 'SMS başarıyla gönderildi';
  }

  private parseResponse(response: string): { success: boolean; code: string; message: string; jobId?: string } {
    const trimmed = response.trim();

    // Sadece JobID (uzun sayısal değer)
    if (/^\d{20,}$/.test(trimmed)) {
      return { success: true, code: 'SUCCESS', message: 'SMS başarıyla gönderildi', jobId: trimmed };
    }

    // "00 JobID" formatı
    const match = trimmed.match(/^(00|01|02)\s+(\d{20,})$/);
    if (match) {
      return { success: true, code: match[1], message: this.getSuccessMessage(match[1]), jobId: match[2] };
    }

    // Tek başına başarı kodları
    if (['00', '01', '02'].includes(trimmed)) {
      return { success: true, code: trimmed, message: this.getSuccessMessage(trimmed) };
    }

    // Hata kodları
    const errors: Record<string, string> = {
      '20': 'Mesaj metni problemi veya karakter sınırı aşımı',
      '30': 'Geçersiz kullanıcı adı/şifre veya API erişim izni yok',
      '40': 'Mesaj başlığı sistemde tanımlı değil',
      '50': 'İYS kontrollü gönderim yapılamıyor',
      '70': 'Hatalı sorgulama - parametre hatası',
      '80': 'Gönderim sınır aşımı',
    };

    return { success: false, code: trimmed, message: errors[trimmed] || `Bilinmeyen hata: ${trimmed}` };
  }

  async sendSms(dto: SendSmsDto) {
    const startTime = Date.now();

    try {
      const username = this.config.get<string>('sms.netgsm.username');
      const password = this.config.get<string>('sms.netgsm.password');

      if (!username || !password) {
        this.logger.error('Netgsm credentials not configured');
        throw new InternalServerErrorException('SMS servisi yapılandırılmamış');
      }

      this.logger.log({ message: 'SMS gönderiliyor', to: dto.no });

      const formData = new URLSearchParams();
      formData.append('usercode', username);
      formData.append('password', password);
      formData.append('gsmno', dto.no);
      formData.append('message', dto.msg);
      if (dto.msgheader) formData.append('msgheader', dto.msgheader);
      if (dto.encoding) formData.append('dil', dto.encoding);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const responseText = await response.text();
      const result = this.parseResponse(responseText);
      const duration = Date.now() - startTime;

      if (result.success) {
        this.logger.log({ message: 'SMS gönderildi', to: dto.no, jobId: result.jobId, duration: `${duration}ms` });
      } else {
        this.logger.warn({ message: 'SMS gönderim hatası', to: dto.no, code: result.code, error: result.message });
      }

      return {
        success: result.success,
        code: result.code,
        message: result.message,
        jobId: result.jobId,
        provider: 'netgsm',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error({ message: 'SMS gönderme hatası', to: dto.no, error: error.message, duration: `${duration}ms` });
      throw new InternalServerErrorException('SMS gönderimi başarısız oldu');
    }
  }

  async getBalance(dto: GetBalanceDto) {
    const startTime = Date.now();

    try {
      const username = this.config.get<string>('sms.netgsm.username');
      const password = this.config.get<string>('sms.netgsm.password');

      if (!username || !password) {
        throw new InternalServerErrorException('SMS servisi yapılandırılmamış');
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(this.balanceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usercode: username, password: password, stip: dto.stip }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await response.json();
      const duration = Date.now() - startTime;

      // Hata kontrolü
      if (data.error || (data.code && data.code !== '00')) {
        const code = data.error || data.code;
        const errors: Record<string, string> = {
          '30': 'Geçersiz kullanıcı adı/şifre',
          '60': 'Paket/kampanya bulunamadı',
          '70': 'Parametre hatası',
        };
        throw new InternalServerErrorException(errors[code] || `Hata: ${code}`);
      }

      this.logger.log({ message: 'Bakiye sorgulandı', stip: dto.stip, duration: `${duration}ms` });

      return {
        success: true,
        data: data,
        stip: dto.stip,
        provider: 'netgsm',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error({ message: 'Bakiye sorgulama hatası', error: error.message });
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException('Bakiye sorgulama başarısız oldu');
    }
  }
}

