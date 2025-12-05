import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { LoggerService } from '../logger/logger.service';
import { EmailService } from '../../email/email.service';
import { NetgsmService } from '../../sms/netgsm.service';
import { PdfService } from '../../pdf/pdf.service';
import { SupabaseService } from '../services/supabase.service';

export interface NotificationJobData {
  reservationDetails: any;
  transactionId: string;
  reservationNumber: string;
  bookingId: string;
}

@Processor('notifications')
export class NotificationProcessor {
  constructor(
    private readonly logger: LoggerService,
    private readonly emailService: EmailService,
    private readonly netgsmService: NetgsmService,
    private readonly pdfService: PdfService,
    private readonly supabase: SupabaseService,
  ) {
    this.logger.setContext('NotificationProcessor');
  }

  @Process('send-booking-confirmation')
  async handleNotification(job: Job<NotificationJobData>) {
    const { reservationDetails, transactionId, reservationNumber, bookingId } = job.data;

    this.logger.log({
      message: 'Queue: Bildirim işlemi başlatıldı',
      jobId: job.id,
      transactionId,
      reservationNumber,
    });

    try {
      // PDF oluştur
      let pdfBuffer: Buffer | undefined;
      let pdfFilename: string | undefined;

      try {
        const pdfResult = await this.pdfService.generateBookingPdf(reservationDetails, reservationNumber);
        pdfBuffer = pdfResult.buffer;
        pdfFilename = `booking-${reservationNumber}.pdf`;

        // PDF'i dosya sistemine kaydet
        await this.pdfService.savePdfToFileSystem(pdfResult.buffer, pdfResult.filePath);

        // PDF yolunu booking tablosuna kaydet
        if (bookingId) {
          const adminClient = this.supabase.getAdminClient();
          await adminClient
            .schema('backend')
            .from('booking')
            .update({ pdf_path: pdfResult.filePath, updated_at: new Date().toISOString() })
            .eq('id', bookingId);
        }

        this.logger.log({ message: 'Queue: PDF oluşturuldu', transactionId, reservationNumber });
      } catch (pdfError) {
        this.logger.error({
          message: 'Queue: PDF oluşturma hatası',
          transactionId,
          error: pdfError instanceof Error ? pdfError.message : String(pdfError),
        });
      }

      // Email ve SMS'i paralel gönder
      const [emailResult, smsResult] = await Promise.allSettled([
        this.emailService.sendBookingConfirmation(reservationDetails, transactionId, pdfBuffer, pdfFilename),
        this.netgsmService.sendBookingConfirmation(reservationDetails, transactionId),
      ]);

      // Email sonucu
      if (emailResult.status === 'fulfilled' && emailResult.value.success) {
        this.logger.log({
          message: 'Queue: Rezervasyon onay emaili gönderildi',
          transactionId,
          reservationNumber,
        });
      } else {
        this.logger.error({
          message: 'Queue: Rezervasyon onay emaili gönderilemedi',
          transactionId,
          error: emailResult.status === 'rejected' ? emailResult.reason : emailResult.value.message,
        });
      }

      // SMS sonucu
      if (smsResult.status === 'fulfilled' && smsResult.value.success) {
        this.logger.log({
          message: 'Queue: Rezervasyon onay SMS gönderildi',
          transactionId,
          reservationNumber,
        });
      } else {
        this.logger.error({
          message: 'Queue: Rezervasyon onay SMS gönderilemedi',
          transactionId,
          error: smsResult.status === 'rejected' ? smsResult.reason : smsResult.value.message,
        });
      }

      this.logger.log({
        message: 'Queue: Bildirim işlemi tamamlandı',
        jobId: job.id,
        transactionId,
        reservationNumber,
      });
    } catch (error) {
      this.logger.error({
        message: 'Queue: Bildirim işlemi hatası',
        jobId: job.id,
        transactionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error; // Job retry için
    }
  }
}

