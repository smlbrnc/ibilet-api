import { Controller, Post, Body, Req, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
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
        const code = null;
        const messages = null;
        
        const body = success ? normalizedResult.data.body : { error: 'error-set-reservation' };

        const { data: insertData, error: insertError } = await adminClient
          .schema('backend')
          .from('pre_transactionid')
          .insert({
            transaction_id: transactionId,
            expires_on: expiresOn,
            success,
            code,
            messages,
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
            messages: null,
            body: { error: 'error-set-reservation' },
          });

        this.logger.log({
          message: 'PAX API hatası - Supabase\'e hata kaydı yapıldı',
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
      const endpoint = (
        this.config.get<string>('pax.endpoints.reservationDetail') || ''
      ).replace('{reservationNumber}', request.ReservationNumber);
      const ip = req.ip || req.socket.remoteAddress || undefined;
      const userInfo = await this.getUserInfoFromToken(authorization);
      const result = await this.paxHttp.post(`${baseUrl}${endpoint}`, {}, {
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
  async getCancellationPenalty(
    @Body() request: CancellationPenaltyRequestDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
  ) {
    try {
      const baseUrl = this.config.get<string>('pax.baseUrl');
      const endpoint = (
        this.config.get<string>('pax.endpoints.cancellationPenalty') || ''
      ).replace('{reservationNumber}', request.reservationNumber);
      const ip = req.ip || req.socket.remoteAddress || undefined;
      const userInfo = await this.getUserInfoFromToken(authorization);
      const result = await this.paxHttp.post(`${baseUrl}${endpoint}`, {}, {
        ip,
        userId: userInfo.userId ?? undefined,
        email: userInfo.email ?? undefined,
      });
      return result.body || result;
    } catch (error) {
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
}

