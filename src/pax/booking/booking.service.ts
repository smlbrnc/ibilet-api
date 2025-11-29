import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaxHttpService } from '../pax-http.service';
import { SupabaseService } from '../../common/services/supabase.service';
import { LoggerService } from '../../common/logger/logger.service';

export interface UserInfo {
  userId: string | null;
  email: string | null;
}

export interface PaxRequestOptions {
  ip?: string;
  userId?: string;
  email?: string;
}

@Injectable()
export class BookingService {
  constructor(
    private readonly paxHttp: PaxHttpService,
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('BookingService');
  }

  /**
   * PAX API endpoint çağrısı yapar (ortak metod)
   */
  async callPaxEndpoint(endpointKey: string, request: any, options: PaxRequestOptions = {}): Promise<any> {
    const baseUrl = this.config.get<string>('pax.baseUrl');
    const endpoint = this.config.get<string>(`pax.endpoints.${endpointKey}`);
    const result = await this.paxHttp.post(`${baseUrl}${endpoint}`, request, options);
    return result.body || result;
  }

  /**
   * Set Reservation Info - PAX API çağrısı ve Supabase kaydı
   */
  async setReservationInfo(request: any, options: PaxRequestOptions = {}): Promise<any> {
    const baseUrl = this.config.get<string>('pax.baseUrl');
    const endpoint = this.config.get<string>('pax.endpoints.setReservationInfo');

    const paxResult = await this.paxHttp.post(`${baseUrl}${endpoint}`, request, options);

    const success = paxResult?.header?.success ?? false;
    const headerMessages = paxResult?.header?.messages ?? null;
    const transactionId = paxResult?.body?.transactionId ?? null;
    const expiresOn = paxResult?.body?.expiresOn ?? null;

    // Supabase'e kaydet
    await this.savePreTransaction({
      transactionId,
      expiresOn,
      success,
      headerMessages,
      body: success ? paxResult?.body : { messages: headerMessages },
      userId: options.userId || null,
    });

    return paxResult?.body || null;
  }

  /**
   * Pre-transaction ve booking kaydı oluştur
   */
  private async savePreTransaction(data: {
    transactionId: string | null;
    expiresOn: string | null;
    success: boolean;
    headerMessages: any;
    body: any;
    userId: string | null;
  }): Promise<void> {
    try {
      const adminClient = this.supabase.getAdminClient();

      const { data: insertData, error: insertError } = await adminClient
        .schema('backend')
        .from('pre_transactionid')
        .insert({
          transaction_id: data.transactionId,
          expires_on: data.expiresOn,
          success: data.success,
          code: null,
          messages: data.headerMessages,
          body: data.body,
        })
        .select()
        .single();

      if (insertError) {
        this.logger.error({ message: 'Supabase kayıt hatası', error: insertError.message, transactionId: data.transactionId });
        return;
      }

      this.logger.log({ message: 'set-reservation-info yanıtı Supabase\'e kaydedildi', transactionId: data.transactionId, success: data.success });

      // Success durumunda booking kaydı oluştur
      if (data.success && insertData?.id && data.transactionId) {
        await this.createBookingRecord(insertData.id, data.transactionId, data.expiresOn, data.userId);
      }
    } catch (error) {
      this.logger.error({
        message: 'Supabase kayıt hatası',
        error: error instanceof Error ? error.message : String(error),
        transactionId: data.transactionId,
      });
    }
  }

  /**
   * Booking kaydı oluştur
   */
  private async createBookingRecord(
    preTransactionId: number,
    transactionId: string,
    expiresOn: string | null,
    userId: string | null,
  ): Promise<void> {
    try {
      const adminClient = this.supabase.getAdminClient();
      const expiresOnDate = expiresOn ? new Date(expiresOn) : null;
      const isExpired = expiresOnDate ? expiresOnDate <= new Date() : true;
      const bookingStatus = isExpired ? 'EXPIRED' : 'AWAITING_PAYMENT';

      const { error: bookingError } = await adminClient
        .schema('backend')
        .from('booking')
        .insert({
          pre_transaction_id: preTransactionId,
          transaction_id: transactionId,
          user_id: userId,
          status: bookingStatus,
        });

      if (bookingError) {
        this.logger.error({ message: 'Booking kayıt hatası', error: bookingError.message, transactionId });
      } else {
        this.logger.log({ message: 'Booking kaydı oluşturuldu', transactionId, status: bookingStatus });
      }
    } catch (error) {
      this.logger.error({
        message: 'Booking kayıt hatası',
        error: error instanceof Error ? error.message : String(error),
        transactionId,
      });
    }
  }

  /**
   * Cancellation penalty sorgula (booking kontrolü ile)
   */
  async getCancellationPenalty(reservationNumber: string, request: any, options: PaxRequestOptions = {}): Promise<any> {
    const adminClient = this.supabase.getAdminClient();

    const { data: booking, error: bookingError } = await adminClient
      .schema('backend')
      .from('booking')
      .select('id, booking_number')
      .eq('booking_number', reservationNumber)
      .single();

    if (bookingError || !booking) {
      throw new NotFoundException({ success: false, code: 'RESERVATION_NOT_FOUND', message: 'Rezervasyon bulunamadı' });
    }

    return this.callPaxEndpoint('cancellationPenalty', request, options);
  }

  /**
   * Rezervasyon iptal et
   */
  async cancelReservation(reservationNumber: string, request: any, options: PaxRequestOptions = {}): Promise<any> {
    const baseUrl = this.config.get<string>('pax.baseUrl');
    const endpoint = (this.config.get<string>('pax.endpoints.cancelReservation') || '').replace('{reservationNumber}', reservationNumber);
    const result = await this.paxHttp.post(`${baseUrl}${endpoint}`, request, options);
    return result.body || result;
  }

  /**
   * Booking durumunu getir ve güncelle
   */
  async getBookingStatus(transactionId: string): Promise<any> {
    const adminClient = this.supabase.getAdminClient();

    // Booking kaydını bul
    const { data: booking, error: bookingError } = await adminClient
      .schema('backend')
      .from('booking')
      .select('*')
      .eq('transaction_id', transactionId)
      .single();

    if (bookingError || !booking) {
      throw new NotFoundException({ success: false, code: 'BOOKING_NOT_FOUND', message: 'Booking bulunamadı' });
    }

    // AWAITING_PAYMENT durumunda güncelleme kontrolü
    if (booking.status === 'AWAITING_PAYMENT') {
      const updatedBooking = await this.checkAndUpdateBookingStatus(booking);
      if (updatedBooking) return this.formatBookingResponse(updatedBooking);
    }

    return this.formatBookingResponse(booking);
  }

  /**
   * Booking status kontrolü ve güncelleme
   */
  private async checkAndUpdateBookingStatus(booking: any): Promise<any | null> {
    const adminClient = this.supabase.getAdminClient();

    const { data: preTransaction, error: preError } = await adminClient
      .schema('backend')
      .from('pre_transactionid')
      .select('success, expires_on')
      .eq('id', booking.pre_transaction_id)
      .single();

    if (preError || !preTransaction) {
      this.logger.error({ message: 'pre_transactionid kaydı bulunamadı', transactionId: booking.transaction_id });
      return null;
    }

    let newStatus: string | null = null;

    // expires_on kontrolü
    if (preTransaction.expires_on) {
      const expiresOnDate = new Date(preTransaction.expires_on);
      if (expiresOnDate <= new Date()) {
        newStatus = 'EXPIRED';
      }
    }

    // success kontrolü
    if (preTransaction.success === false && !newStatus) {
      newStatus = 'FAILED';
    }

    if (!newStatus) return null;

    // Güncelle
    const { data: updatedBooking, error: updateError } = await adminClient
      .schema('backend')
      .from('booking')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', booking.id)
      .select()
      .single();

    if (updateError) {
      this.logger.error({ message: 'Booking güncelleme hatası', error: updateError.message, transactionId: booking.transaction_id });
      return null;
    }

    this.logger.log({ message: 'Booking status güncellendi', transactionId: booking.transaction_id, oldStatus: booking.status, newStatus });
    return updatedBooking;
  }

  /**
   * Booking verisini frontend için formatla
   */
  private formatBookingResponse(booking: any) {
    return {
      success: true,
      data: {
        transactionId: booking.transaction_id,
        userId: booking.user_id,
        status: booking.status,
        orderId: booking.order_id,
        orderDetail: booking.order_detail,
        bookingNumber: booking.booking_number,
        reservationDetails: booking.reservation_details,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at,
      },
    };
  }
}

