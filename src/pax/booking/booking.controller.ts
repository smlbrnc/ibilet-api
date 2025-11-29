import { Controller, Post, Get, Body, Req, Headers, Param, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { PaxHttpService } from '../pax-http.service';
import { BeginTransactionRequestDto } from './dto/begin-transaction-request.dto';
import { AddServicesRequestDto } from './dto/add-services-request.dto';
import { RemoveServicesRequestDto } from './dto/remove-services-request.dto';
import { SetReservationInfoRequestDto } from './dto/set-reservation-info-request.dto';
import { CommitTransactionRequestDto } from './dto/commit-transaction-request.dto';
import { ReservationDetailRequestDto } from './dto/reservation-detail-request.dto';
import { ReservationListRequestDto } from './dto/reservation-list-request.dto';
import { CancellationPenaltyRequestDto } from './dto/cancellation-penalty-request.dto';
import { CancelReservationRequestDto } from './dto/cancel-reservation-request.dto';
import { handlePaxApiError } from '../../common/utils/error-handler.util';
import { SupabaseService } from '../../common/services/supabase.service';
import { LoggerService } from '../../common/logger/logger.service';

@ApiTags('Booking')
@Controller('booking')
export class BookingController {
  constructor(
    private readonly paxHttp: PaxHttpService,
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('BookingController');
  }

  private async getUserInfoFromToken(
    authorization?: string,
  ): Promise<{ userId: string | null; email: string | null }> {
    return { userId: null, email: null };
  }

  /**
   * Booking verisini frontend için formatlar
   * Sadece gerekli alanları döndürür
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

  @Post('begin-transaction')
  @ApiOperation({ summary: 'Rezervasyon başlat (Begin Transaction)' })
  @ApiResponse({ status: 200, description: 'Transaction başlatıldı' })
  async beginTransaction(
    @Body() request: BeginTransactionRequestDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
  ) {
    try {
      const baseUrl = this.config.get<string>('pax.baseUrl');
      const endpoint = this.config.get<string>('pax.endpoints.beginTransaction');
      const ip = req.ip || req.socket.remoteAddress || undefined;
      const userInfo = await this.getUserInfoFromToken(authorization);
      const result = await this.paxHttp.post(`${baseUrl}${endpoint}`, request, {
        ip,
        userId: userInfo.userId ?? undefined,
        email: userInfo.email ?? undefined,
      });
      return result.body || result;
    } catch (error) {
      handlePaxApiError(error, 'BEGIN_TRANSACTION_ERROR', 'Rezervasyon başlatılamadı');
    }
  }

  @Post('add-services')
  @ApiOperation({ summary: 'Ekstra hizmet ekle (Add Services)' })
  @ApiResponse({ status: 200, description: 'Hizmetler eklendi' })
  async addServices(
    @Body() request: AddServicesRequestDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
  ) {
    try {
      const baseUrl = this.config.get<string>('pax.baseUrl');
      const endpoint = this.config.get<string>('pax.endpoints.addServices');
      const ip = req.ip || req.socket.remoteAddress || undefined;
      const userInfo = await this.getUserInfoFromToken(authorization);
      const result = await this.paxHttp.post(`${baseUrl}${endpoint}`, request, {
        ip,
        userId: userInfo.userId ?? undefined,
        email: userInfo.email ?? undefined,
      });
      return result.body || result;
    } catch (error) {
      handlePaxApiError(error, 'ADD_SERVICES_ERROR', 'Hizmet eklenemedi');
    }
  }

  @Post('remove-services')
  @ApiOperation({ summary: 'Hizmet kaldır (Remove Services)' })
  @ApiResponse({ status: 200, description: 'Hizmetler kaldırıldı' })
  async removeServices(
    @Body() request: RemoveServicesRequestDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
  ) {
    try {
      const baseUrl = this.config.get<string>('pax.baseUrl');
      const endpoint = this.config.get<string>('pax.endpoints.removeServices');
      const ip = req.ip || req.socket.remoteAddress || undefined;
      const userInfo = await this.getUserInfoFromToken(authorization);
      const result = await this.paxHttp.post(`${baseUrl}${endpoint}`, request, {
        ip,
        userId: userInfo.userId ?? undefined,
        email: userInfo.email ?? undefined,
      });
      return result.body || result;
    } catch (error) {
      handlePaxApiError(error, 'REMOVE_SERVICES_ERROR', 'Hizmet kaldırılamadı');
    }
  }

  @Post('set-reservation-info')
  @ApiOperation({ summary: 'Rezervasyon bilgilerini ayarla (Set Reservation Info)' })
  @ApiResponse({ status: 200, description: 'Rezervasyon bilgileri kaydedildi' })
  async setReservationInfo(
    @Body() request: SetReservationInfoRequestDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
  ) {
    let paxResult: any;
    try {
      const baseUrl = this.config.get<string>('pax.baseUrl');
      const endpoint = this.config.get<string>('pax.endpoints.setReservationInfo');
      const ip = req.ip || req.socket.remoteAddress || undefined;
      const userInfo = await this.getUserInfoFromToken(authorization);
      paxResult = await this.paxHttp.post(`${baseUrl}${endpoint}`, request, {
        ip,
        userId: userInfo.userId ?? undefined,
        email: userInfo.email ?? undefined,
      });
      
      // PAX API eski formatı yeni formata dönüştür: { body, header } -> { success, data: { body } }
      const success = paxResult?.header?.success ?? false;
      const headerMessages = paxResult?.header?.messages ?? null;
      const normalizedResult = {
        success,
        data: {
          body: paxResult?.body || null,
        },
      };
      
      // Supabase'e kayıt (try-catch ile izole et, PAX yanıtını engelleme)
      try {
        const adminClient = this.supabase.getAdminClient();
        
        const transactionId = normalizedResult?.data?.body?.transactionId ?? null;
        const expiresOn = normalizedResult?.data?.body?.expiresOn ?? null;
        
        // Hata durumunda messages değerini body'ye kaydet
        const body = success 
          ? normalizedResult.data.body 
          : { messages: headerMessages };

        const { data: insertData, error: insertError } = await adminClient
          .schema('backend')
          .from('pre_transactionid')
          .insert({
            transaction_id: transactionId,
            expires_on: expiresOn,
            success,
            code: null,
            messages: headerMessages,
            body,
          })
          .select()
          .single();

        if (insertError) {
          this.logger.error({
            message: 'Supabase kayıt hatası',
            error: insertError.message,
            details: insertError,
            transactionId,
          });
        } else {
          this.logger.log({
            message: 'set-reservation-info yanıtı Supabase\'e kaydedildi',
            transactionId,
            success,
            insertedId: insertData?.id,
          });

          // Success durumunda booking tablosuna kayıt ekle
          if (success && insertData?.id && transactionId) {
            // expires_on kontrolü ve status belirleme
            const expiresOnDate = expiresOn ? new Date(expiresOn) : null;
            const isExpired = expiresOnDate ? expiresOnDate <= new Date() : true;
            const bookingStatus = isExpired ? 'EXPIRED' : 'AWAITING_PAYMENT';

            const { error: bookingError } = await adminClient
              .schema('backend')
              .from('booking')
              .insert({
                pre_transaction_id: insertData.id,
                transaction_id: transactionId,
                user_id: userInfo.userId || null,
                status: bookingStatus,
              });

            if (bookingError) {
              this.logger.error({
                message: 'Booking kayıt hatası',
                error: bookingError.message,
                details: bookingError,
                transactionId,
              });
            } else {
              this.logger.log({
                message: 'Booking kaydı oluşturuldu',
                transactionId,
                status: bookingStatus,
              });
            }
          }
        }
      } catch (supabaseError) {
        const transactionId = normalizedResult?.data?.body?.transactionId ?? null;
        this.logger.error({
          message: 'Supabase kayıt hatası',
          error: supabaseError instanceof Error ? supabaseError.message : String(supabaseError),
          transactionId,
        });
      }

      return normalizedResult.data.body;
    } catch (error) {
      // PAX API hatası olsa bile Supabase'e kayıt yap (success: false ile)
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      try {
        const adminClient = this.supabase.getAdminClient();
        await adminClient
          .schema('backend')
          .from('pre_transactionid')
          .insert({
            transaction_id: null,
            expires_on: null,
            success: false,
            code: null,
            messages: [{ message: errorMessage }],
            body: { messages: [{ message: errorMessage }] },
          });

        this.logger.log({
          message: 'PAX API hatası - Supabase\'e hata kaydı yapıldı',
          errorMessage,
        });
      } catch (supabaseError) {
        this.logger.error({
          message: 'PAX API hatası sonrası Supabase kayıt hatası',
          error: supabaseError instanceof Error ? supabaseError.message : String(supabaseError),
        });
      }

      handlePaxApiError(error, 'SET_RESERVATION_INFO_ERROR', 'Rezervasyon bilgileri kaydedilemedi');
    }
  }

  @Post('commit-transaction')
  @ApiOperation({ summary: 'Rezervasyonu onayla (Commit Transaction)' })
  @ApiResponse({ status: 200, description: 'Rezervasyon onaylandı' })
  async commitTransaction(
    @Body() request: CommitTransactionRequestDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
  ) {
    try {
      const baseUrl = this.config.get<string>('pax.baseUrl');
      const endpoint = this.config.get<string>('pax.endpoints.commitTransaction');
      const ip = req.ip || req.socket.remoteAddress || undefined;
      const userInfo = await this.getUserInfoFromToken(authorization);
      const result = await this.paxHttp.post(`${baseUrl}${endpoint}`, request, {
        ip,
        userId: userInfo.userId ?? undefined,
        email: userInfo.email ?? undefined,
      });
      return result.body || result;
    } catch (error) {
      handlePaxApiError(error, 'COMMIT_TRANSACTION_ERROR', 'Rezervasyon onaylanamadı');
    }
  }

  @Post('reservation-detail')
  @ApiOperation({ summary: 'Rezervasyon detayını getir (Reservation Detail)' })
  @ApiResponse({ status: 200, description: 'Rezervasyon detayları' })
  async getReservationDetail(
    @Body() request: ReservationDetailRequestDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
  ) {
    try {
      const baseUrl = this.config.get<string>('pax.baseUrl');
      const endpoint = this.config.get<string>('pax.endpoints.reservationDetail');
      const ip = req.ip || req.socket.remoteAddress || undefined;
      const userInfo = await this.getUserInfoFromToken(authorization);
      const result = await this.paxHttp.post(`${baseUrl}${endpoint}`, request, {
        ip,
        userId: userInfo.userId ?? undefined,
        email: userInfo.email ?? undefined,
      });
      return result.body || result;
    } catch (error) {
      handlePaxApiError(error, 'RESERVATION_DETAIL_ERROR', 'Rezervasyon detayları alınamadı');
    }
  }

  @Post('reservation-list')
  @ApiOperation({ summary: 'Rezervasyon listesi getir (Reservation List)' })
  @ApiResponse({ status: 200, description: 'Rezervasyon listesi' })
  async getReservationList(
    @Body() request: ReservationListRequestDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
  ) {
    try {
      const baseUrl = this.config.get<string>('pax.baseUrl');
      const endpoint = this.config.get<string>('pax.endpoints.reservationList');
      const ip = req.ip || req.socket.remoteAddress || undefined;
      const userInfo = await this.getUserInfoFromToken(authorization);
      const result = await this.paxHttp.post(`${baseUrl}${endpoint}`, request, {
        ip,
        userId: userInfo.userId ?? undefined,
        email: userInfo.email ?? undefined,
      });
      return result.body || result;
    } catch (error) {
      handlePaxApiError(error, 'RESERVATION_LIST_ERROR', 'Rezervasyon listesi alınamadı');
    }
  }

  @Post('cancellation-penalty')
  @ApiOperation({ summary: 'İptal cezası sorgula (Cancellation Penalty)' })
  @ApiResponse({ status: 200, description: 'İptal ceza tutarı ve detayları' })
  @ApiResponse({ status: 404, description: 'Rezervasyon bulunamadı' })
  async getCancellationPenalty(
    @Body() request: CancellationPenaltyRequestDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
  ) {
    try {
      // booking_number ile eşleşen kayıt var mı kontrol et
      const adminClient = this.supabase.getAdminClient();
      const { data: booking, error: bookingError } = await adminClient
        .schema('backend')
        .from('booking')
        .select('id, booking_number')
        .eq('booking_number', request.reservationNumber)
        .single();

      if (bookingError || !booking) {
        throw new NotFoundException({
          success: false,
          code: 'RESERVATION_NOT_FOUND',
          message: 'Rezervasyon bulunamadı',
        });
      }

      const baseUrl = this.config.get<string>('pax.baseUrl');
      const endpoint = this.config.get<string>('pax.endpoints.cancellationPenalty');
      const ip = req.ip || req.socket.remoteAddress || undefined;
      const userInfo = await this.getUserInfoFromToken(authorization);
      const result = await this.paxHttp.post(`${baseUrl}${endpoint}`, request, {
        ip,
        userId: userInfo.userId ?? undefined,
        email: userInfo.email ?? undefined,
      });
      return result.body || result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      handlePaxApiError(error, 'CANCELLATION_PENALTY_ERROR', 'İptal cezası sorgulanamadı');
    }
  }

  @Post('cancel-reservation')
  @ApiOperation({ summary: 'Rezervasyonu iptal et (Cancel Reservation)' })
  @ApiResponse({ status: 200, description: 'Rezervasyon başarıyla iptal edildi' })
  async cancelReservation(
    @Body() request: CancelReservationRequestDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
  ) {
    try {
      const baseUrl = this.config.get<string>('pax.baseUrl');
      const endpoint = (
        this.config.get<string>('pax.endpoints.cancelReservation') || ''
      ).replace('{reservationNumber}', request.reservationNumber);
      const ip = req.ip || req.socket.remoteAddress || undefined;
      const userInfo = await this.getUserInfoFromToken(authorization);
      const result = await this.paxHttp.post(`${baseUrl}${endpoint}`, request, {
        ip,
        userId: userInfo.userId ?? undefined,
        email: userInfo.email ?? undefined,
      });
      return result.body || result;
    } catch (error) {
      handlePaxApiError(error, 'CANCEL_RESERVATION_ERROR', 'Rezervasyon iptal edilemedi');
    }
  }

  @Get(':transactionId')
  @ApiOperation({ summary: 'Booking durumunu getir ve güncelle' })
  @ApiParam({ name: 'transactionId', description: 'PAX API transaction ID' })
  @ApiResponse({ status: 200, description: 'Booking durumu' })
  @ApiResponse({ status: 404, description: 'Booking bulunamadı' })
  async getBookingStatus(@Param('transactionId') transactionId: string) {
    try {
      const adminClient = this.supabase.getAdminClient();

      // 1. booking kaydını bul
      const { data: booking, error: bookingError } = await adminClient
        .schema('backend')
        .from('booking')
        .select('*')
        .eq('transaction_id', transactionId)
        .single();

      if (bookingError || !booking) {
        throw new NotFoundException({
          success: false,
          code: 'BOOKING_NOT_FOUND',
          message: 'Booking bulunamadı',
        });
      }

      // 2. AWAITING_PAYMENT durumunda kontrol ve güncelleme yap
      if (booking.status === 'AWAITING_PAYMENT') {
        // pre_transactionid tablosunu sorgula
        const { data: preTransaction, error: preError } = await adminClient
          .schema('backend')
          .from('pre_transactionid')
          .select('success, expires_on')
          .eq('id', booking.pre_transaction_id)
          .single();

        if (preError || !preTransaction) {
          this.logger.error({
            message: 'pre_transactionid kaydı bulunamadı',
            transactionId,
            preTransactionId: booking.pre_transaction_id,
          });
          // pre_transaction bulunamasa bile mevcut status'u döndür
          return this.formatBookingResponse(booking);
        }

        let newStatus: string | null = null;

        // expires_on kontrolü - geçmiş tarihse EXPIRED
        if (preTransaction.expires_on) {
          const expiresOnDate = new Date(preTransaction.expires_on);
          if (expiresOnDate <= new Date()) {
            newStatus = 'EXPIRED';
          }
        }

        // success kontrolü - false ise FAILED (expires_on kontrolünden öncelikli değil)
        if (preTransaction.success === false && !newStatus) {
          newStatus = 'FAILED';
        }

        // Güncelleme gerekiyorsa yap
        if (newStatus) {
          const { data: updatedBooking, error: updateError } = await adminClient
            .schema('backend')
            .from('booking')
            .update({ 
              status: newStatus, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', booking.id)
            .select()
            .single();

          if (updateError) {
            this.logger.error({
              message: 'Booking güncelleme hatası',
              error: updateError.message,
              transactionId,
            });
            // Güncelleme başarısız olsa bile mevcut status'u döndür
            return this.formatBookingResponse(booking);
          }

          this.logger.log({
            message: 'Booking status güncellendi',
            transactionId,
            oldStatus: booking.status,
            newStatus,
          });

          return this.formatBookingResponse(updatedBooking);
        }
      }

      // 3. Diğer statuslarda veya güncelleme gerekmiyorsa mevcut durumu döndür
      return this.formatBookingResponse(booking);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof HttpException) {
        throw error;
      }

      this.logger.error({
        message: 'Booking durumu alınırken hata',
        error: error instanceof Error ? error.message : String(error),
        transactionId,
      });

      throw new HttpException(
        {
          success: false,
          code: 'BOOKING_STATUS_ERROR',
          message: 'Booking durumu alınamadı',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

