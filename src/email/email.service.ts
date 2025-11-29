import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendEmailDto } from './dto/send-email.dto';
import { LoggerService } from '../common/logger/logger.service';
import { SupabaseService } from '../common/services/supabase.service';
import { buildBookingConfirmationEmail } from './templates/booking-confirmation.template';

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
    const apiKey = this.config.get<string>('resend.apiKey');
    
    if (!apiKey) {
      this.logger.warn('Resend API key bulunamadı');
      this.resend = null;
    } else {
      try {
        const { Resend } = require('resend');
        this.resend = new Resend(apiKey);
      } catch {
        this.logger.warn('Resend paketi yüklü değil');
        this.resend = null;
      }
    }

    this.fromEmail = this.config.get<string>('resend.fromEmail') || 'İbilet <noreply@mail.ibilet.com>';
  }

  async sendEmail(sendEmailDto: SendEmailDto) {
    const startTime = Date.now();

    try {
      if (!this.resend) {
        throw new InternalServerErrorException('Email servisi yapılandırılmamış');
      }

      if (!sendEmailDto.to || !sendEmailDto.subject || !sendEmailDto.html) {
        throw new BadRequestException('Eksik email alanları');
      }

      const emailPromise = this.resend.emails.send({
        from: this.fromEmail,
        to: [sendEmailDto.to],
        subject: sendEmailDto.subject,
        html: sendEmailDto.html,
      });

      // 10 saniye timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email gönderme zaman aşımı')), 10000);
      });

      const { data, error }: ResendResponse = await Promise.race([emailPromise, timeoutPromise]) as ResendResponse;

      if (error) {
        this.logger.error({ message: 'Resend API hatası', to: sendEmailDto.to, error: error.message });
        throw new InternalServerErrorException(`Email gönderilemedi: ${error.message}`);
      }

      const duration = Date.now() - startTime;
      this.logger.log({ message: 'Email gönderildi', to: sendEmailDto.to, duration: `${duration}ms` });

      return {
        success: true,
        message: 'Email başarıyla gönderildi',
        emailId: data?.id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error({ message: 'Email gönderme hatası', to: sendEmailDto.to, error: error.message, duration: `${duration}ms` });

      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException('Email gönderimi sırasında hata oluştu');
    }
  }

  /**
   * Rezervasyon onay emaili gönderir ve sonucu veritabanına kaydeder
   * @param reservationDetails reservation_details verisi
   * @param transactionId Transaction ID
   * @returns Email gönderim sonucu
   */
  async sendBookingConfirmation(
    reservationDetails: any,
    transactionId?: string,
  ): Promise<{ success: boolean; message: string; emailId?: string }> {
    const reservationData = reservationDetails?.body?.reservationData;
    const reservationInfo = reservationData?.reservationInfo;
    const reservationNumber = reservationInfo?.bookingNumber || '';
    
    // İlk uçuş servisinden PNR al
    const flightServices = reservationData?.services?.filter((s: any) => s.productType === 3 && !s.isExtraService) || [];
    const pnrNo = flightServices[0]?.pnrNo || '';

    const { html, subject, toEmail } = buildBookingConfirmationEmail(reservationDetails);

    // Email adresi bulunamadı
    if (!toEmail) {
      const message = 'Email adresi bulunamadı';
      this.logger.warn('Rezervasyon onay emaili gönderilemedi: Leader yolcu email adresi bulunamadı');
      await this.saveEmailLog({ transactionId, reservationNumber, pnrNo, email: '-', status: 'FAILED', message });
      return { success: false, message };
    }

    // Template oluşturulamadı
    if (!html || !subject) {
      const message = 'Email template oluşturulamadı';
      this.logger.warn('Rezervasyon onay emaili gönderilemedi: Template oluşturulamadı');
      await this.saveEmailLog({ transactionId, reservationNumber, pnrNo, email: toEmail, status: 'FAILED', message });
      return { success: false, message };
    }

    try {
      const result = await this.sendEmail({ to: toEmail, subject, html });
      
      this.logger.log({ 
        message: 'Rezervasyon onay emaili gönderildi', 
        to: toEmail,
        bookingNumber: reservationNumber,
      });

      // Başarılı kaydı veritabanına yaz
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
      
      this.logger.error({ 
        message: 'Rezervasyon onay emaili gönderme hatası', 
        error: errorMessage,
        bookingNumber: reservationNumber,
      });

      // Hata kaydını veritabanına yaz
      await this.saveEmailLog({
        transactionId,
        reservationNumber,
        pnrNo,
        email: toEmail,
        status: 'FAILED',
        message: errorMessage,
      });
      
      // Email hatası rezervasyon işlemini etkilememeli
      return { success: false, message: errorMessage };
    }
  }

  /**
   * Email gönderim kaydını veritabanına kaydeder
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
      
      await adminClient
        .schema('backend')
        .from('booking_email')
        .insert({
          transaction_id: data.transactionId || '',
          reservation_number: data.reservationNumber || null,
          pnr_no: data.pnrNo || null,
          email: data.email,
          status: data.status,
          message: data.message || null,
          email_id: data.emailId || null,
        });
    } catch (error) {
      this.logger.error({
        message: 'Email log kaydetme hatası',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

