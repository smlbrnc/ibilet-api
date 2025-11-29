import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendEmailDto } from './dto/send-email.dto';
import { LoggerService } from '../common/logger/logger.service';

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
}

