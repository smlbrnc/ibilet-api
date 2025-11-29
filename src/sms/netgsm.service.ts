import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendSmsDto } from './dto/send-sms.dto';
import { GetBalanceDto } from './dto/get-balance.dto';
import { LoggerService } from '../common/logger/logger.service';
import { SupabaseService } from '../common/services/supabase.service';
import { buildBookingSmsMessage } from './templates';
import {
  NETGSM_URLS,
  NETGSM_TIMEOUT,
  SMS_SUCCESS_MESSAGES,
  SMS_ERROR_MESSAGES,
  BALANCE_ERROR_MESSAGES,
  SMS_SUCCESS_CODES,
} from './constants/netgsm.constant';

interface SmsResult {
  success: boolean;
  code: string;
  message: string;
  jobId?: string;
}

@Injectable()
export class NetgsmService {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
    private readonly supabase: SupabaseService,
  ) {
    this.logger.setContext('NetgsmService');
  }

  /**
   * Netgsm credentials al ve doğrula
   */
  private getCredentials(): { username: string; password: string } {
    const username = this.config.get<string>('sms.netgsm.username');
    const password = this.config.get<string>('sms.netgsm.password');

    if (!username || !password) {
      this.logger.error('Netgsm credentials not configured');
      throw new InternalServerErrorException('SMS servisi yapılandırılmamış');
    }

    return { username, password };
  }

  /**
   * Timeout ile fetch işlemi
   */
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NETGSM_TIMEOUT);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * SMS yanıtını parse et
   */
  private parseResponse(response: string): SmsResult {
    const trimmed = response.trim();

    // Sadece JobID (uzun sayısal değer)
    if (/^\d{20,}$/.test(trimmed)) {
      return { success: true, code: 'SUCCESS', message: 'SMS başarıyla gönderildi', jobId: trimmed };
    }

    // "00 JobID" formatı
    const match = trimmed.match(/^(00|01|02)\s+(\d{20,})$/);
    if (match) {
      return { success: true, code: match[1], message: SMS_SUCCESS_MESSAGES[match[1]], jobId: match[2] };
    }

    // Tek başına başarı kodları
    if (SMS_SUCCESS_CODES.includes(trimmed)) {
      return { success: true, code: trimmed, message: SMS_SUCCESS_MESSAGES[trimmed] };
    }

    // Hata kodları
    return { success: false, code: trimmed, message: SMS_ERROR_MESSAGES[trimmed] || `Bilinmeyen hata: ${trimmed}` };
  }

  /**
   * SMS gönder
   */
  async sendSms(dto: SendSmsDto) {
    const startTime = Date.now();

    try {
      const { username, password } = this.getCredentials();

      this.logger.log({ message: 'SMS gönderiliyor', to: dto.no });

      const formData = new URLSearchParams();
      formData.append('usercode', username);
      formData.append('password', password);
      formData.append('gsmno', dto.no);
      formData.append('message', dto.msg);
      if (dto.msgheader) formData.append('msgheader', dto.msgheader);
      if (dto.encoding) formData.append('dil', dto.encoding);

      const response = await this.fetchWithTimeout(NETGSM_URLS.SMS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

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

  /**
   * Bakiye sorgula
   */
  async getBalance(dto: GetBalanceDto) {
    const startTime = Date.now();

    try {
      const { username, password } = this.getCredentials();

      const response = await this.fetchWithTimeout(NETGSM_URLS.BALANCE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usercode: username, password, stip: dto.stip }),
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      // Hata kontrolü
      if (data.error || (data.code && data.code !== '00')) {
        const code = data.error || data.code;
        throw new InternalServerErrorException(BALANCE_ERROR_MESSAGES[code] || `Hata: ${code}`);
      }

      this.logger.log({ message: 'Bakiye sorgulandı', stip: dto.stip, duration: `${duration}ms` });

      return {
        success: true,
        data,
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

  /**
   * Rezervasyon onay SMS'i gönder
   */
  async sendBookingConfirmation(
    reservationDetails: any,
    transactionId?: string,
  ): Promise<{ success: boolean; message: string; jobId?: string }> {
    const { message, phone, outboundPnr, returnPnr, reservationNumber } = buildBookingSmsMessage(reservationDetails);

    // Telefon numarası kontrolü
    if (!phone) {
      const errorMsg = 'Telefon numarası bulunamadı';
      this.logger.warn('Rezervasyon onay SMS gönderilemedi: Leader yolcu telefon numarası bulunamadı');
      await this.saveSmsLog({ transactionId, reservationNumber, pnrNo: outboundPnr, phone: '-', status: 'FAILED', message: errorMsg });
      return { success: false, message: errorMsg };
    }

    // Mesaj kontrolü
    if (!message) {
      const errorMsg = 'SMS mesajı oluşturulamadı';
      this.logger.warn('Rezervasyon onay SMS gönderilemedi: Mesaj oluşturulamadı');
      await this.saveSmsLog({ transactionId, reservationNumber, pnrNo: outboundPnr, phone, status: 'FAILED', message: errorMsg });
      return { success: false, message: errorMsg };
    }

    try {
      const result = await this.sendSms({ no: phone, msg: message, msgheader: 'IBGROUP', encoding: 'TR' });

      this.logger.log({ message: 'Rezervasyon onay SMS gönderildi', to: phone, reservationNumber });

      await this.saveSmsLog({
        transactionId,
        reservationNumber,
        pnrNo: returnPnr ? `${outboundPnr},${returnPnr}` : outboundPnr,
        phone,
        status: result.success ? 'SUCCESS' : 'FAILED',
        message: result.success ? message : result.message,
        jobId: result.jobId,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error({ message: 'Rezervasyon onay SMS gönderme hatası', error: errorMessage, reservationNumber });

      await this.saveSmsLog({ transactionId, reservationNumber, pnrNo: outboundPnr, phone, status: 'FAILED', message: errorMessage });

      return { success: false, message: errorMessage };
    }
  }

  /**
   * SMS log kaydet
   */
  private async saveSmsLog(data: {
    transactionId?: string;
    reservationNumber?: string;
    pnrNo?: string;
    phone: string;
    status: 'SUCCESS' | 'FAILED';
    message?: string;
    jobId?: string;
  }): Promise<void> {
    try {
      const adminClient = this.supabase.getAdminClient();

      await adminClient.schema('backend').from('booking_sms').insert({
        transaction_id: data.transactionId || '',
        reservation_number: data.reservationNumber || null,
        pnr_no: data.pnrNo || null,
        phone: data.phone,
        status: data.status,
        message: data.message || null,
        job_id: data.jobId || null,
      });
    } catch (error) {
      this.logger.error({ message: 'SMS log kaydetme hatası', error: error instanceof Error ? error.message : String(error) });
    }
  }
}
