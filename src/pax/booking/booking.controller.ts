import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Param,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { BookingService } from './booking.service';
import { PaxRequestOptions } from '../pax.service';
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
import { LoggerService } from '../../common/logger/logger.service';
import { Public } from '../../common/decorators/public.decorator';
import { OptionalAuthGuard } from '../../common/guards/optional-auth.guard';
import { OptionalCurrentUser } from '../../common/decorators/optional-current-user.decorator';

@ApiTags('Booking')
@Controller('booking')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('BookingController');
  }

  /**
   * Request'ten options oluştur (sadece IP)
   */
  private getRequestOptions(req: Request): PaxRequestOptions {
    return { ip: req.ip || req.socket.remoteAddress || undefined };
  }

  /**
   * Request'ten options oluştur (IP + User ID)
   */
  private getRequestOptionsWithUser(req: Request, userId?: string): PaxRequestOptions {
    return {
      ip: req.ip || req.socket.remoteAddress || undefined,
      userId,
    };
  }

  @Public()
  @Post('begin-transaction')
  @ApiOperation({ summary: 'Rezervasyon başlat (Begin Transaction)' })
  @ApiResponse({ status: 200, description: 'Transaction başlatıldı' })
  async beginTransaction(@Body() request: BeginTransactionRequestDto, @Req() req: Request) {
    try {
      return await this.bookingService.callPaxEndpoint(
        'beginTransaction',
        request,
        this.getRequestOptions(req),
      );
    } catch (error) {
      handlePaxApiError(error, 'BEGIN_TRANSACTION_ERROR', 'Rezervasyon başlatılamadı');
    }
  }

  @Public()
  @Post('add-services')
  @ApiOperation({ summary: 'Ekstra hizmet ekle (Add Services)' })
  @ApiResponse({ status: 200, description: 'Hizmetler eklendi' })
  async addServices(@Body() request: AddServicesRequestDto, @Req() req: Request) {
    try {
      return await this.bookingService.callPaxEndpoint(
        'addServices',
        request,
        this.getRequestOptions(req),
      );
    } catch (error) {
      handlePaxApiError(error, 'ADD_SERVICES_ERROR', 'Hizmet eklenemedi');
    }
  }

  @Public()
  @Post('remove-services')
  @ApiOperation({ summary: 'Hizmet kaldır (Remove Services)' })
  @ApiResponse({ status: 200, description: 'Hizmetler kaldırıldı' })
  async removeServices(@Body() request: RemoveServicesRequestDto, @Req() req: Request) {
    try {
      return await this.bookingService.callPaxEndpoint(
        'removeServices',
        request,
        this.getRequestOptions(req),
      );
    } catch (error) {
      handlePaxApiError(error, 'REMOVE_SERVICES_ERROR', 'Hizmet kaldırılamadı');
    }
  }

  @Public() // Global AuthGuard'ı bypass et
  @UseGuards(OptionalAuthGuard) // Optional auth için kendi guard'ımızı kullan
  @Post('set-reservation-info')
  @ApiOperation({ summary: 'Rezervasyon bilgilerini ayarla (Set Reservation Info)' })
  @ApiResponse({ status: 200, description: 'Rezervasyon bilgileri kaydedildi' })
  @ApiBearerAuth()
  async setReservationInfo(
    @Body() request: SetReservationInfoRequestDto,
    @Req() req: Request,
    @OptionalCurrentUser() user?: any,
  ) {
    try {
      // Token varsa user bilgisi OptionalAuthGuard tarafından alınmış olacak
      const userId = user?.id;
      const options = this.getRequestOptionsWithUser(req, userId);
      return await this.bookingService.setReservationInfo(request, options);
    } catch (error) {
      handlePaxApiError(error, 'SET_RESERVATION_INFO_ERROR', 'Rezervasyon bilgileri kaydedilemedi');
    }
  }

  @Public()
  @Post('commit-transaction')
  @ApiOperation({ summary: 'Rezervasyonu onayla (Commit Transaction)' })
  @ApiResponse({ status: 200, description: 'Rezervasyon onaylandı' })
  async commitTransaction(@Body() request: CommitTransactionRequestDto, @Req() req: Request) {
    try {
      return await this.bookingService.callPaxEndpoint(
        'commitTransaction',
        request,
        this.getRequestOptions(req),
      );
    } catch (error) {
      handlePaxApiError(error, 'COMMIT_TRANSACTION_ERROR', 'Rezervasyon onaylanamadı');
    }
  }

  @Public()
  @Post('reservation-detail')
  @ApiOperation({ summary: 'Rezervasyon detayını getir (Reservation Detail)' })
  @ApiResponse({ status: 200, description: 'Rezervasyon detayları' })
  async getReservationDetail(@Body() request: ReservationDetailRequestDto, @Req() req: Request) {
    try {
      return await this.bookingService.callPaxEndpoint(
        'reservationDetail',
        request,
        this.getRequestOptions(req),
      );
    } catch (error) {
      handlePaxApiError(error, 'RESERVATION_DETAIL_ERROR', 'Rezervasyon detayları alınamadı');
    }
  }

  @Public()
  @Post('reservation-list')
  @ApiOperation({ summary: 'Rezervasyon listesi getir (Reservation List)' })
  @ApiResponse({ status: 200, description: 'Rezervasyon listesi' })
  async getReservationList(@Body() request: ReservationListRequestDto, @Req() req: Request) {
    try {
      return await this.bookingService.callPaxEndpoint(
        'reservationList',
        request,
        this.getRequestOptions(req),
      );
    } catch (error) {
      handlePaxApiError(error, 'RESERVATION_LIST_ERROR', 'Rezervasyon listesi alınamadı');
    }
  }

  @Public()
  @Post('cancellation-penalty')
  @ApiOperation({ summary: 'İptal cezası sorgula (Cancellation Penalty)' })
  @ApiResponse({ status: 200, description: 'İptal ceza tutarı ve detayları' })
  @ApiResponse({ status: 404, description: 'Rezervasyon bulunamadı' })
  async getCancellationPenalty(
    @Body() request: CancellationPenaltyRequestDto,
    @Req() req: Request,
  ) {
    try {
      return await this.bookingService.getCancellationPenalty(
        request.reservationNumber,
        request,
        this.getRequestOptions(req),
      );
    } catch (error) {
      handlePaxApiError(error, 'CANCELLATION_PENALTY_ERROR', 'İptal cezası sorgulanamadı');
    }
  }

  @Public()
  @Post('cancel-reservation')
  @ApiOperation({ summary: 'Rezervasyonu iptal et (Cancel Reservation)' })
  @ApiResponse({ status: 200, description: 'Rezervasyon başarıyla iptal edildi' })
  async cancelReservation(@Body() request: CancelReservationRequestDto, @Req() req: Request) {
    try {
      return await this.bookingService.cancelReservation(
        request.reservationNumber,
        request,
        this.getRequestOptions(req),
      );
    } catch (error) {
      handlePaxApiError(error, 'CANCEL_RESERVATION_ERROR', 'Rezervasyon iptal edilemedi');
    }
  }

  @Public()
  @Get(':transactionId')
  @ApiOperation({ summary: 'Booking durumunu getir ve güncelle' })
  @ApiParam({ name: 'transactionId', description: 'PAX API transaction ID' })
  @ApiResponse({ status: 200, description: 'Booking durumu' })
  @ApiResponse({ status: 404, description: 'Booking bulunamadı' })
  async getBookingStatus(@Param('transactionId') transactionId: string) {
    try {
      return await this.bookingService.getBookingStatus(transactionId);
    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error({
        message: 'Booking durumu alınırken hata',
        error: error instanceof Error ? error.message : String(error),
        transactionId,
      });

      throw new HttpException(
        { success: false, code: 'BOOKING_STATUS_ERROR', message: 'Booking durumu alınamadı' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
