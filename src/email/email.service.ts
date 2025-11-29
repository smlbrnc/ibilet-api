import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendEmailDto } from './dto/send-email.dto';
import { LoggerService } from '../common/logger/logger.service';
import { SupabaseService } from '../common/services/supabase.service';
import { buildBookingConfirmationEmail } from './templates';
import { EMAIL_TIMEOUT, DEFAULT_FROM_EMAIL } from './constants/email.constant';

type ResendResponse = {
  data?: { id?: string };
  error?: { message: string };
};

@Injectable()
export class EmailService {
  private readonly resend: any;
  private readonly fromEmail: string;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
    private readonly supabase: SupabaseService,
  ) {
    this.logger.setContext('EmailService');
    this.resend = this.initializeResend();
    this.fromEmail = this.config.get<string>('resend.fromEmail') || DEFAULT_FROM_EMAIL;
  }

  /**
   * Resend client'ı initialize et
   */
  private initializeResend(): any {
    const apiKey = this.config.get<string>('resend.apiKey');

    if (!apiKey) {
      this.logger.warn('Resend API key bulunamadı');
      return null;
    }

    try {
      const { Resend } = require('resend');
      return new Resend(apiKey);
    } catch {
      this.logger.warn('Resend paketi yüklü değil');
      return null;
    }
  }

  /**
   * Timeout ile promise çalıştır
   */
  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Email gönderme zaman aşımı')), ms),
    );
    return Promise.race([promise, timeout]);
  }

  /**
   * Email gönder
   */
  async sendEmail(dto: SendEmailDto) {
    const startTime = Date.now();

    try {
      if (!this.resend) {
        throw new InternalServerErrorException('Email servisi yapılandırılmamış');
      }

      if (!dto.to || !dto.subject || !dto.html) {
        throw new BadRequestException('Eksik email alanları');
      }

      const emailPromise = this.resend.emails.send({
        from: this.fromEmail,
        to: [dto.to],
        subject: dto.subject,
        html: dto.html,
      });

      const { data, error }: ResendResponse = await this.withTimeout(emailPromise, EMAIL_TIMEOUT);

      if (error) {
        this.logger.error({ message: 'Resend API hatası', to: dto.to, error: error.message });
        throw new InternalServerErrorException(`Email gönderilemedi: ${error.message}`);
      }

      const duration = Date.now() - startTime;
      this.logger.log({ message: 'Email gönderildi', to: dto.to, duration: `${duration}ms` });

      return {
        success: true,
        message: 'Email başarıyla gönderildi',
        emailId: data?.id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error({ message: 'Email gönderme hatası', to: dto.to, error: error.message, duration: `${duration}ms` });

      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException('Email gönderimi sırasında hata oluştu');
    }
  }

  /**
   * Rezervasyon onay emaili gönder
   */
  async sendBookingConfirmation(
    reservationDetails: any,
    transactionId?: string,
  ): Promise<{ success: boolean; message: string; emailId?: string }> {
    const reservationData = reservationDetails?.body?.reservationData;
    const reservationNumber = reservationData?.reservationInfo?.bookingNumber || '';

    // İlk uçuş servisinden PNR al
    const flightServices = reservationData?.services?.filter((s: any) => s.productType === 3 && !s.isExtraService) || [];
    const pnrNo = flightServices[0]?.pnrNo || '';

    const { html, subject, toEmail } = buildBookingConfirmationEmail(reservationDetails);

    // Validasyonlar
    if (!toEmail) {
      const message = 'Email adresi bulunamadı';
      this.logger.warn('Rezervasyon onay emaili gönderilemedi: Leader yolcu email adresi bulunamadı');
      await this.saveEmailLog({ transactionId, reservationNumber, pnrNo, email: '-', status: 'FAILED', message });
      return { success: false, message };
    }

    if (!html || !subject) {
      const message = 'Email template oluşturulamadı';
      this.logger.warn('Rezervasyon onay emaili gönderilemedi: Template oluşturulamadı');
      await this.saveEmailLog({ transactionId, reservationNumber, pnrNo, email: toEmail, status: 'FAILED', message });
      return { success: false, message };
    }

    try {
      const result = await this.sendEmail({ to: toEmail, subject, html });

      this.logger.log({ message: 'Rezervasyon onay emaili gönderildi', to: toEmail, bookingNumber: reservationNumber });

      await this.saveEmailLog({
        transactionId,
        reservationNumber,
        pnrNo,
        email: toEmail,
        status: 'SUCCESS',
        message: 'Email başarıyla gönderildi',
        emailId: result.emailId,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error({ message: 'Rezervasyon onay emaili gönderme hatası', error: errorMessage, bookingNumber: reservationNumber });

      await this.saveEmailLog({ transactionId, reservationNumber, pnrNo, email: toEmail, status: 'FAILED', message: errorMessage });

      return { success: false, message: errorMessage };
    }
  }

  /**
   * Email log kaydet
   */
  private async saveEmailLog(data: {
    transactionId?: string;
    reservationNumber?: string;
    pnrNo?: string;
    email: string;
    status: 'SUCCESS' | 'FAILED';
    message?: string;
    emailId?: string;
  }): Promise<void> {
    try {
      const adminClient = this.supabase.getAdminClient();

      await adminClient.schema('backend').from('booking_email').insert({
        transaction_id: data.transactionId || '',
        reservation_number: data.reservationNumber || null,
        pnr_no: data.pnrNo || null,
        email: data.email,
        status: data.status,
        message: data.message || null,
        email_id: data.emailId || null,
      });
    } catch (error) {
      this.logger.error({ message: 'Email log kaydetme hatası', error: error instanceof Error ? error.message : String(error) });
    }
  }
}
