import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { LoggerService } from '../common/logger/logger.service';
import { SupabaseService } from '../common/services/supabase.service';
import * as fs from 'fs';
import * as path from 'path';
import { buildFlightBookingPdf, buildHotelBookingPdf } from './templates';

interface PdfResult {
  buffer: Buffer;
  filePath: string;
}

interface BookingRecord {
  id: string;
  reservation_details: any;
  booking_number: string | null;
  pdf_path: string | null;
}

@Injectable()
export class PdfService {
  private readonly storagePath: string;

  constructor(
    private readonly logger: LoggerService,
    private readonly supabase: SupabaseService,
  ) {
    this.logger.setContext('PdfService');
    this.storagePath = path.join(process.cwd(), 'storage', 'pdfs');
    this.ensureStorageDirectory();
  }

  /** Storage klasörünü oluştur */
  private ensureStorageDirectory(): void {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  /** PDF dosya yolu oluştur */
  private getPdfPath(reservationNumber: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(this.storagePath, `booking-${reservationNumber}-${timestamp}.pdf`);
  }

  /** ProductType belirle */
  private getProductType(reservationDetails: any): number | null {
    const services = reservationDetails?.body?.reservationData?.services || [];
    const mainService = services.find((s: any) => !s.isExtraService);
    return mainService?.productType || null;
  }

  /** PDF buffer'ı oluştur */
  private buildPdfBuffer(doc: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }

  /** PDF'i dosya sistemine kaydet */
  async savePdfToFileSystem(buffer: Buffer, filePath: string): Promise<void> {
    try {
      fs.writeFileSync(filePath, buffer);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error({ message: 'PDF kaydetme hatası', error: msg, filePath });
      throw new InternalServerErrorException(`PDF kaydedilemedi: ${msg}`);
    }
  }

  /** PDF dosyasını oku */
  private readPdfFromFileSystem(filePath: string): Buffer | null {
    try {
      return fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
    } catch {
      return null;
    }
  }

  /** Rezervasyon detaylarından PDF oluştur */
  async generateBookingPdf(reservationDetails: any, reservationNumber: string): Promise<PdfResult> {
    try {
      if (!reservationDetails?.body?.reservationData) {
        throw new Error('Rezervasyon verisi bulunamadı');
      }

      const productType = this.getProductType(reservationDetails);
      const doc =
        productType === 2
          ? buildHotelBookingPdf(reservationDetails)
          : buildFlightBookingPdf(reservationDetails);

      const buffer = await this.buildPdfBuffer(doc);
      const filePath = this.getPdfPath(reservationNumber);

      return { buffer, filePath };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error({ message: 'PDF oluşturma hatası', error: msg, reservationNumber });
      throw new InternalServerErrorException(`PDF oluşturulamadı: ${msg}`);
    }
  }

  /** Booking kaydından PDF oluştur veya cache'den döndür */
  private async generateFromBookingRecord(booking: BookingRecord): Promise<PdfResult> {
    // Cache kontrolü
    if (booking.pdf_path) {
      const cached = this.readPdfFromFileSystem(booking.pdf_path);
      if (cached) return { buffer: cached, filePath: booking.pdf_path };
    }

    if (!booking.reservation_details) {
      throw new Error('Rezervasyon detayları bulunamadı');
    }

    const reservationNumber = booking.booking_number || `booking-${booking.id}`;
    const result = await this.generateBookingPdf(booking.reservation_details, reservationNumber);

    // PDF yolunu kaydet
    await this.updatePdfPath(booking.id, result.filePath);

    return result;
  }

  /** PDF yolunu booking tablosuna kaydet */
  private async updatePdfPath(bookingId: string, pdfPath: string): Promise<void> {
    try {
      await this.supabase
        .getAdminClient()
        .schema('backend')
        .from('booking')
        .update({ pdf_path: pdfPath, updated_at: new Date().toISOString() })
        .eq('id', bookingId);
    } catch {
      // PDF yolu kaydedilemezse devam et
    }
  }

  /** Booking ID ile PDF oluştur */
  async generatePdfFromBooking(bookingId: string): Promise<PdfResult> {
    try {
      const { data: booking, error } = await this.supabase
        .getAdminClient()
        .schema('backend')
        .from('booking')
        .select('id, reservation_details, booking_number, pdf_path')
        .eq('id', bookingId)
        .single();

      if (error || !booking) {
        throw new Error('Booking bulunamadı');
      }

      return this.generateFromBookingRecord(booking as BookingRecord);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error({ message: 'PDF oluşturma hatası', error: msg, bookingId });
      throw new InternalServerErrorException(`PDF oluşturulamadı: ${msg}`);
    }
  }

  /** Reservation number ile PDF oluştur */
  async generatePdfFromReservationNumber(reservationNumber: string): Promise<PdfResult> {
    try {
      const adminClient = this.supabase.getAdminClient();

      // booking_number kolonu ile ara
      const { data: bookings } = await adminClient
        .schema('backend')
        .from('booking')
        .select('id, reservation_details, booking_number, pdf_path')
        .eq('booking_number', reservationNumber)
        .limit(1);

      let booking = bookings?.[0] as BookingRecord | undefined;

      // Bulunamazsa reservation_details JSON içinde ara
      if (!booking) {
        const { data: allBookings } = await adminClient
          .schema('backend')
          .from('booking')
          .select('id, reservation_details, booking_number, pdf_path')
          .not('reservation_details', 'is', null);

        booking = allBookings?.find(
          (b: any) =>
            b.reservation_details?.body?.reservationData?.reservationInfo?.bookingNumber ===
            reservationNumber,
        ) as BookingRecord | undefined;
      }

      if (!booking) {
        throw new Error('Booking bulunamadı');
      }

      return this.generateFromBookingRecord(booking);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error({ message: 'PDF oluşturma hatası', error: msg, reservationNumber });
      throw new InternalServerErrorException(`PDF oluşturulamadı: ${msg}`);
    }
  }
}
