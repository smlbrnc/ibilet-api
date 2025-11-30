import { Controller, Get, Post, Put, Delete, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateProfileDto, CreateFavoriteDto, CreateTravellerDto, UpdateTravellerDto } from './dto';

@ApiTags('User')
@Controller('user')
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  private getToken(authorization?: string): string {
    return authorization?.replace('Bearer ', '') || '';
  }

  // ==================== EMAIL CHECK (PUBLIC) ====================

  @Get('check')
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
  async getProfile(@Headers('authorization') authorization?: string) {
    return this.userService.getProfile(this.getToken(authorization));
  }

  @Put('profile')
  @ApiOperation({ summary: 'Kullanıcı profilini güncelle' })
  @ApiResponse({ status: 200, description: 'Profil güncellendi' })
  @ApiResponse({ status: 401, description: 'Yetkisiz erişim' })
  async updateProfile(
    @Headers('authorization') authorization: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(this.getToken(authorization), dto);
  }

  // ==================== FAVORITES ====================

  @Get('favorites')
  @ApiOperation({ summary: 'Favorileri listele' })
  @ApiQuery({ name: 'type', required: false, enum: ['flight', 'hotel', 'destination'] })
  @ApiResponse({ status: 200, description: 'Favori listesi' })
  async getFavorites(
    @Headers('authorization') authorization: string,
    @Query('type') type?: string,
  ) {
    return this.userService.getFavorites(this.getToken(authorization), type);
  }

  @Post('favorites')
  @ApiOperation({ summary: 'Favorilere ekle' })
  @ApiResponse({ status: 201, description: 'Favori eklendi' })
  async addFavorite(
    @Headers('authorization') authorization: string,
    @Body() dto: CreateFavoriteDto,
  ) {
    return this.userService.addFavorite(this.getToken(authorization), dto);
  }

  @Delete('favorites/:id')
  @ApiOperation({ summary: 'Favoriyi sil' })
  @ApiResponse({ status: 200, description: 'Favori silindi' })
  async removeFavorite(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ) {
    return this.userService.removeFavorite(this.getToken(authorization), id);
  }

  // ==================== TRAVELLERS ====================

  @Get('travellers')
  @ApiOperation({ summary: 'Kayıtlı yolcuları listele' })
  @ApiResponse({ status: 200, description: 'Yolcu listesi' })
  async getTravellers(@Headers('authorization') authorization: string) {
    return this.userService.getTravellers(this.getToken(authorization));
  }

  @Get('travellers/:id')
  @ApiOperation({ summary: 'Yolcu detayını getir' })
  @ApiResponse({ status: 200, description: 'Yolcu detayı' })
  @ApiResponse({ status: 404, description: 'Yolcu bulunamadı' })
  async getTraveller(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ) {
    return this.userService.getTraveller(this.getToken(authorization), id);
  }

  @Post('travellers')
  @ApiOperation({ summary: 'Yeni yolcu ekle' })
  @ApiResponse({ status: 201, description: 'Yolcu eklendi' })
  async addTraveller(
    @Headers('authorization') authorization: string,
    @Body() dto: CreateTravellerDto,
  ) {
    return this.userService.addTraveller(this.getToken(authorization), dto);
  }

  @Put('travellers/:id')
  @ApiOperation({ summary: 'Yolcu bilgilerini güncelle' })
  @ApiResponse({ status: 200, description: 'Yolcu güncellendi' })
  async updateTraveller(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() dto: UpdateTravellerDto,
  ) {
    return this.userService.updateTraveller(this.getToken(authorization), id, dto);
  }

  @Delete('travellers/:id')
  @ApiOperation({ summary: 'Yolcuyu sil' })
  @ApiResponse({ status: 200, description: 'Yolcu silindi' })
  async removeTraveller(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ) {
    return this.userService.removeTraveller(this.getToken(authorization), id);
  }

  // ==================== NOTIFICATIONS ====================

  @Get('notifications')
  @ApiOperation({ summary: 'Bildirimleri listele' })
  @ApiQuery({ name: 'unread_only', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Bildirim listesi' })
  async getNotifications(
    @Headers('authorization') authorization: string,
    @Query('unread_only') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    return this.userService.getNotifications(this.getToken(authorization), {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Put('notifications/:id/read')
  @ApiOperation({ summary: 'Bildirimi okundu olarak işaretle' })
  @ApiResponse({ status: 200, description: 'Bildirim güncellendi' })
  async markNotificationAsRead(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ) {
    return this.userService.markNotificationAsRead(this.getToken(authorization), id);
  }

  @Put('notifications/read-all')
  @ApiOperation({ summary: 'Tüm bildirimleri okundu olarak işaretle' })
  @ApiResponse({ status: 200, description: 'Bildirimler güncellendi' })
  async markAllNotificationsAsRead(@Headers('authorization') authorization: string) {
    return this.userService.markAllNotificationsAsRead(this.getToken(authorization));
  }

  // ==================== TRANSACTIONS ====================

  @Get('transactions')
  @ApiOperation({ summary: 'Ödeme geçmişini listele' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'İşlem listesi' })
  async getTransactions(
    @Headers('authorization') authorization: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.userService.getTransactions(this.getToken(authorization), {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'İşlem detayını getir' })
  @ApiResponse({ status: 200, description: 'İşlem detayı' })
  @ApiResponse({ status: 404, description: 'İşlem bulunamadı' })
  async getTransaction(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ) {
    return this.userService.getTransaction(this.getToken(authorization), id);
  }

  // ==================== USER DISCOUNTS ====================

  @Get('discounts')
  @ApiOperation({ summary: 'Kullanıcıya tanımlı indirim kodlarını listele' })
  @ApiQuery({ name: 'active_only', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'İndirim listesi' })
  async getUserDiscounts(
    @Headers('authorization') authorization: string,
    @Query('active_only') activeOnly?: string,
  ) {
    return this.userService.getUserDiscounts(this.getToken(authorization), {
      activeOnly: activeOnly === 'true',
    });
  }

  @Get('discounts/validate/:code')
  @ApiOperation({ summary: 'Kullanıcıya özel indirim kodunu doğrula' })
  @ApiResponse({ status: 200, description: 'Geçerli indirim kodu' })
  @ApiResponse({ status: 404, description: 'Geçersiz indirim kodu' })
  async validateUserDiscount(
    @Headers('authorization') authorization: string,
    @Param('code') code: string,
  ) {
    return this.userService.validateUserDiscount(this.getToken(authorization), code);
  }
}

