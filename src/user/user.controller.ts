import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateProfileDto, CreateFavoriteDto, CreateTravellerDto, UpdateTravellerDto } from './dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('User')
@Controller('user')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ==================== EMAIL CHECK (PUBLIC) ====================

  @Get('check')
  @Public()
  @ApiOperation({ summary: 'Email adresi kayıtlı mı kontrol et (Public)' })
  @ApiQuery({ name: 'email', required: true, description: 'Kontrol edilecek email adresi' })
  @ApiResponse({ status: 200, description: 'Email kontrol sonucu' })
  @ApiResponse({ status: 400, description: 'Geçersiz istek' })
  async checkEmail(@Query('email') email: string) {
    return this.userService.checkEmail(email);
  }

  // ==================== PROFILE ====================

  @Get('profile')
  @ApiOperation({ summary: 'Kullanıcı profilini getir' })
  @ApiResponse({ status: 200, description: 'Profil bilgileri' })
  @ApiResponse({ status: 401, description: 'Yetkisiz erişim' })
  async getProfile(@CurrentUser() user: any) {
    return this.userService.getProfile(user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Kullanıcı profilini güncelle' })
  @ApiResponse({ status: 200, description: 'Profil güncellendi' })
  @ApiResponse({ status: 401, description: 'Yetkisiz erişim' })
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(user.id, dto);
  }

  // ==================== AVATAR ====================

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Avatar yükle' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Avatar dosyası (JPEG/PNG, max 1MB)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Avatar yüklendi' })
  @ApiResponse({ status: 400, description: 'Geçersiz dosya' })
  @ApiResponse({ status: 401, description: 'Yetkisiz erişim' })
  async uploadAvatar(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    return this.userService.uploadAvatar(user.id, file);
  }

  @Delete('avatar')
  @ApiOperation({ summary: 'Avatar sil' })
  @ApiResponse({ status: 200, description: 'Avatar silindi' })
  @ApiResponse({ status: 401, description: 'Yetkisiz erişim' })
  async deleteAvatar(@CurrentUser() user: any) {
    return this.userService.deleteAvatar(user.id);
  }

  // ==================== FAVORITES ====================

  @Get('favorites')
  @ApiOperation({ summary: 'Favorileri listele' })
  @ApiQuery({ name: 'type', required: false, enum: ['flight', 'hotel', 'destination'] })
  @ApiResponse({ status: 200, description: 'Favori listesi' })
  async getFavorites(@CurrentUser() user: any, @Query('type') type?: string) {
    return this.userService.getFavorites(user.id, type);
  }

  @Post('favorites')
  @ApiOperation({ summary: 'Favorilere ekle' })
  @ApiResponse({ status: 201, description: 'Favori eklendi' })
  async addFavorite(@CurrentUser() user: any, @Body() dto: CreateFavoriteDto) {
    return this.userService.addFavorite(user.id, dto);
  }

  @Delete('favorites/:id')
  @ApiOperation({ summary: 'Favoriyi sil' })
  @ApiResponse({ status: 200, description: 'Favori silindi' })
  async removeFavorite(@CurrentUser() user: any, @Param('id') id: string) {
    return this.userService.removeFavorite(user.id, id);
  }

  // ==================== TRAVELLERS ====================

  @Get('travellers')
  @ApiOperation({ summary: 'Kayıtlı yolcuları listele' })
  @ApiResponse({ status: 200, description: 'Yolcu listesi' })
  async getTravellers(@CurrentUser() user: any) {
    return this.userService.getTravellers(user.id);
  }

  @Get('travellers/:id')
  @ApiOperation({ summary: 'Yolcu detayını getir' })
  @ApiResponse({ status: 200, description: 'Yolcu detayı' })
  @ApiResponse({ status: 404, description: 'Yolcu bulunamadı' })
  async getTraveller(@CurrentUser() user: any, @Param('id') id: string) {
    return this.userService.getTraveller(user.id, id);
  }

  @Post('travellers')
  @ApiOperation({ summary: 'Yeni yolcu ekle' })
  @ApiResponse({ status: 201, description: 'Yolcu eklendi' })
  async addTraveller(@CurrentUser() user: any, @Body() dto: CreateTravellerDto) {
    return this.userService.addTraveller(user.id, dto);
  }

  @Put('travellers/:id')
  @ApiOperation({ summary: 'Yolcu bilgilerini güncelle' })
  @ApiResponse({ status: 200, description: 'Yolcu güncellendi' })
  async updateTraveller(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateTravellerDto,
  ) {
    return this.userService.updateTraveller(user.id, id, dto);
  }

  @Delete('travellers/:id')
  @ApiOperation({ summary: 'Yolcuyu sil' })
  @ApiResponse({ status: 200, description: 'Yolcu silindi' })
  async removeTraveller(@CurrentUser() user: any, @Param('id') id: string) {
    return this.userService.removeTraveller(user.id, id);
  }

  // ==================== NOTIFICATIONS ====================

  @Get('notifications')
  @ApiOperation({ summary: 'Bildirimleri listele' })
  @ApiQuery({ name: 'unread_only', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Bildirim listesi' })
  async getNotifications(
    @CurrentUser() user: any,
    @Query('unread_only') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    return this.userService.getNotifications(user.id, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Put('notifications/:id/read')
  @ApiOperation({ summary: 'Bildirimi okundu olarak işaretle' })
  @ApiResponse({ status: 200, description: 'Bildirim güncellendi' })
  async markNotificationAsRead(@CurrentUser() user: any, @Param('id') id: string) {
    return this.userService.markNotificationAsRead(user.id, id);
  }

  @Put('notifications/read-all')
  @ApiOperation({ summary: 'Tüm bildirimleri okundu olarak işaretle' })
  @ApiResponse({ status: 200, description: 'Bildirimler güncellendi' })
  async markAllNotificationsAsRead(@CurrentUser() user: any) {
    return this.userService.markAllNotificationsAsRead(user.id);
  }

  // ==================== BOOKINGS ====================

  @Get('bookings')
  @ApiOperation({ summary: 'Kullanıcının rezervasyonlarını listele' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'AWAITING_PAYMENT',
      'PAYMENT_IN_PROGRESS',
      'CONFIRMED',
      'CANCELLED',
      'EXPIRED',
      'FAILED',
    ],
    description: 'Durum filtresi',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Rezervasyon listesi' })
  async getBookings(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.userService.getBookings(user.id, {
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('bookings/:id')
  @ApiOperation({ summary: 'Rezervasyon detayını getir' })
  @ApiResponse({ status: 200, description: 'Rezervasyon detayı' })
  @ApiResponse({ status: 404, description: 'Rezervasyon bulunamadı' })
  async getBooking(@CurrentUser() user: any, @Param('id') id: string) {
    return this.userService.getBooking(user.id, id);
  }

  // ==================== TRANSACTIONS ====================

  @Get('transactions')
  @ApiOperation({ summary: 'Ödeme geçmişini listele' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'İşlem listesi' })
  async getTransactions(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.userService.getTransactions(user.id, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'İşlem detayını getir' })
  @ApiResponse({ status: 200, description: 'İşlem detayı' })
  @ApiResponse({ status: 404, description: 'İşlem bulunamadı' })
  async getTransaction(@CurrentUser() user: any, @Param('id') id: string) {
    return this.userService.getTransaction(user.id, id);
  }

  // ==================== USER DISCOUNTS ====================

  @Get('discounts')
  @ApiOperation({ summary: 'Kullanıcıya tanımlı indirim kodlarını listele' })
  @ApiQuery({ name: 'active_only', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'İndirim listesi' })
  async getUserDiscounts(@CurrentUser() user: any, @Query('active_only') activeOnly?: string) {
    return this.userService.getUserDiscounts(user.id, {
      activeOnly: activeOnly === 'true',
    });
  }

  @Get('discounts/validate/:code')
  @ApiOperation({ summary: 'Kullanıcıya özel indirim kodunu doğrula' })
  @ApiResponse({ status: 200, description: 'Geçerli indirim kodu' })
  @ApiResponse({ status: 404, description: 'Geçersiz indirim kodu' })
  async validateUserDiscount(@CurrentUser() user: any, @Param('code') code: string) {
    return this.userService.validateUserDiscount(user.id, code);
  }

  // ==================== SESSIONS ====================

  @Get('sessions')
  @ApiOperation({ summary: 'Aktif oturumları listele' })
  @ApiQuery({
    name: 'current_session_id',
    required: false,
    description: 'Mevcut oturum ID (Bu cihaz işaretlemesi için)',
  })
  @ApiResponse({ status: 200, description: 'Oturum listesi' })
  @ApiResponse({ status: 401, description: 'Yetkisiz erişim' })
  async getSessions(
    @CurrentUser() user: any,
    @Query('current_session_id') currentSessionId?: string,
  ) {
    return this.userService.getSessions(user.id, currentSessionId);
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Belirli bir oturumu sonlandır' })
  @ApiResponse({ status: 200, description: 'Oturum sonlandırıldı' })
  @ApiResponse({ status: 404, description: 'Oturum bulunamadı' })
  @ApiResponse({ status: 401, description: 'Yetkisiz erişim' })
  async terminateSession(@CurrentUser() user: any, @Param('id') id: string) {
    return this.userService.terminateSession(user.id, id);
  }

  @Delete('sessions')
  @ApiOperation({ summary: 'Mevcut oturum hariç tüm oturumları sonlandır' })
  @ApiQuery({
    name: 'current_session_id',
    required: true,
    description: 'Mevcut oturum ID (Silinmeyecek)',
  })
  @ApiResponse({ status: 200, description: 'Diğer oturumlar sonlandırıldı' })
  @ApiResponse({ status: 401, description: 'Yetkisiz erişim' })
  async terminateOtherSessions(
    @CurrentUser() user: any,
    @Query('current_session_id') currentSessionId: string,
  ) {
    return this.userService.terminateOtherSessions(user.id, currentSessionId);
  }
}
