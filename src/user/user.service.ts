import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { SupabaseService } from '../common/services/supabase.service';
import { LoggerService } from '../common/logger/logger.service';
import { UpdateProfileDto, CreateFavoriteDto, CreateTravellerDto, UpdateTravellerDto } from './dto';

@Injectable()
export class UserService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('UserService');
  }

  private throwError(code: string, message: string, status: HttpStatus): never {
    throw new HttpException({ success: false, code, message }, status);
  }

  // Ortak hata yakalama wrapper'ı
  private async handleRequest<T>(
    operation: () => Promise<T>,
    errorCode: string,
    errorMessage: string,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: errorMessage, error: error.message });
      this.throwError(errorCode, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Token'dan user ID çıkar
  async getUserIdFromToken(token: string): Promise<string> {
    if (!token) this.throwError('UNAUTHORIZED', 'Token bulunamadı', HttpStatus.UNAUTHORIZED);

    const { data: { user }, error } = await this.supabase.getAnonClient().auth.getUser(token);
    if (error || !user) this.throwError('UNAUTHORIZED', 'Geçersiz token', HttpStatus.UNAUTHORIZED);

    return user.id;
  }

  // ==================== EMAIL CHECK (PUBLIC) ====================

  async checkEmail(email: string) {
    return this.handleRequest(async () => {
      if (!email) this.throwError('EMAIL_REQUIRED', 'Email adresi gereklidir', HttpStatus.BAD_REQUEST);

      const { data, error } = await this.supabase.getAdminClient()
        .from('user_profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (error) {
        this.logger.error({ message: 'Email kontrol hatası', error: error.message });
        this.throwError('CHECK_EMAIL_ERROR', 'Email kontrolü yapılamadı', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return { success: true, data: { exists: !!data, email: email.toLowerCase() } };
    }, 'CHECK_EMAIL_ERROR', 'Email kontrolü yapılamadı');
  }

  // ==================== PROFILE ====================

  async getProfile(token: string) {
    return this.handleRequest(async () => {
      const userId = await this.getUserIdFromToken(token);

      const { data, error } = await this.supabase.getAdminClient()
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) this.throwError('PROFILE_ERROR', error.message, HttpStatus.BAD_REQUEST);

      return { success: true, data };
    }, 'PROFILE_ERROR', 'Profil getirilemedi');
  }

  async updateProfile(token: string, dto: UpdateProfileDto) {
    return this.handleRequest(async () => {
      const userId = await this.getUserIdFromToken(token);

      const { data, error } = await this.supabase.getAdminClient()
        .from('user_profiles')
        .update({ ...dto, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (error) this.throwError('PROFILE_ERROR', error.message, HttpStatus.BAD_REQUEST);

      this.logger.log({ message: 'Profil güncellendi', userId });
      return { success: true, data };
    }, 'PROFILE_ERROR', 'Profil güncellenemedi');
  }

  // ==================== FAVORITES ====================

  async getFavorites(token: string, type?: string) {
    return this.handleRequest(async () => {
      const userId = await this.getUserIdFromToken(token);

      let query = this.supabase.getAdminClient()
        .from('user_favorites')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (type) query = query.eq('type', type);

      const { data, error } = await query;
      if (error) this.throwError('FAVORITES_ERROR', error.message, HttpStatus.BAD_REQUEST);

      return { success: true, data };
    }, 'FAVORITES_ERROR', 'Favoriler getirilemedi');
  }

  async addFavorite(token: string, dto: CreateFavoriteDto) {
    return this.handleRequest(async () => {
      const userId = await this.getUserIdFromToken(token);

      const { data, error } = await this.supabase.getAdminClient()
        .from('user_favorites')
        .insert([{ ...dto, user_id: userId }])
        .select()
        .single();

      if (error) this.throwError('FAVORITES_ERROR', error.message, HttpStatus.BAD_REQUEST);

      this.logger.log({ message: 'Favori eklendi', userId, type: dto.type });
      return { success: true, data };
    }, 'FAVORITES_ERROR', 'Favori eklenemedi');
  }

  async removeFavorite(token: string, id: string) {
    return this.handleRequest(async () => {
      const userId = await this.getUserIdFromToken(token);

      const { error } = await this.supabase.getAdminClient()
        .from('user_favorites')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) this.throwError('FAVORITES_ERROR', error.message, HttpStatus.BAD_REQUEST);

      this.logger.log({ message: 'Favori silindi', userId, favoriteId: id });
      return { success: true, message: 'Favori silindi' };
    }, 'FAVORITES_ERROR', 'Favori silinemedi');
  }

  // ==================== TRAVELLERS ====================

  async getTravellers(token: string) {
    return this.handleRequest(async () => {
      const userId = await this.getUserIdFromToken(token);

      const { data, error } = await this.supabase.getAdminClient()
        .from('user_travellers')
        .select('*')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) this.throwError('TRAVELLERS_ERROR', error.message, HttpStatus.BAD_REQUEST);

      return { success: true, data };
    }, 'TRAVELLERS_ERROR', 'Yolcular getirilemedi');
  }

  async getTraveller(token: string, id: string) {
    return this.handleRequest(async () => {
      const userId = await this.getUserIdFromToken(token);

      const { data, error } = await this.supabase.getAdminClient()
        .from('user_travellers')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error || !data) this.throwError('TRAVELLER_NOT_FOUND', 'Yolcu bulunamadı', HttpStatus.NOT_FOUND);

      return { success: true, data };
    }, 'TRAVELLERS_ERROR', 'Yolcu getirilemedi');
  }

  async addTraveller(token: string, dto: CreateTravellerDto) {
    return this.handleRequest(async () => {
      const userId = await this.getUserIdFromToken(token);

      const { data, error } = await this.supabase.getAdminClient()
        .from('user_travellers')
        .insert([{ ...dto, user_id: userId }])
        .select()
        .single();

      if (error) this.throwError('TRAVELLERS_ERROR', error.message, HttpStatus.BAD_REQUEST);

      this.logger.log({ message: 'Yolcu eklendi', userId, travellerId: data.id });
      return { success: true, data };
    }, 'TRAVELLERS_ERROR', 'Yolcu eklenemedi');
  }

  async updateTraveller(token: string, id: string, dto: UpdateTravellerDto) {
    return this.handleRequest(async () => {
      const userId = await this.getUserIdFromToken(token);

      const { data, error } = await this.supabase.getAdminClient()
        .from('user_travellers')
        .update({ ...dto, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) this.throwError('TRAVELLERS_ERROR', error.message, HttpStatus.BAD_REQUEST);

      this.logger.log({ message: 'Yolcu güncellendi', userId, travellerId: id });
      return { success: true, data };
    }, 'TRAVELLERS_ERROR', 'Yolcu güncellenemedi');
  }

  async removeTraveller(token: string, id: string) {
    return this.handleRequest(async () => {
      const userId = await this.getUserIdFromToken(token);

      const { error } = await this.supabase.getAdminClient()
        .from('user_travellers')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) this.throwError('TRAVELLERS_ERROR', error.message, HttpStatus.BAD_REQUEST);

      this.logger.log({ message: 'Yolcu silindi', userId, travellerId: id });
      return { success: true, message: 'Yolcu silindi' };
    }, 'TRAVELLERS_ERROR', 'Yolcu silinemedi');
  }

  // ==================== NOTIFICATIONS ====================

  async getNotifications(token: string, options?: { unreadOnly?: boolean; limit?: number }) {
    return this.handleRequest(async () => {
      const userId = await this.getUserIdFromToken(token);

      let query = this.supabase.getAdminClient()
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options?.unreadOnly) query = query.eq('is_read', false);
      if (options?.limit) query = query.limit(options.limit);

      const { data, error } = await query;
      if (error) this.throwError('NOTIFICATIONS_ERROR', error.message, HttpStatus.BAD_REQUEST);

      return { success: true, data, unreadCount: data?.filter(n => !n.is_read).length || 0 };
    }, 'NOTIFICATIONS_ERROR', 'Bildirimler getirilemedi');
  }

  async markNotificationAsRead(token: string, id: string) {
    return this.handleRequest(async () => {
      const userId = await this.getUserIdFromToken(token);

      const { error } = await this.supabase.getAdminClient()
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) this.throwError('NOTIFICATIONS_ERROR', error.message, HttpStatus.BAD_REQUEST);

      return { success: true, message: 'Bildirim okundu olarak işaretlendi' };
    }, 'NOTIFICATIONS_ERROR', 'Bildirim güncellenemedi');
  }

  async markAllNotificationsAsRead(token: string) {
    return this.handleRequest(async () => {
      const userId = await this.getUserIdFromToken(token);

      const { error } = await this.supabase.getAdminClient()
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) this.throwError('NOTIFICATIONS_ERROR', error.message, HttpStatus.BAD_REQUEST);

      return { success: true, message: 'Tüm bildirimler okundu olarak işaretlendi' };
    }, 'NOTIFICATIONS_ERROR', 'Bildirimler güncellenemedi');
  }

  // ==================== BOOKINGS ====================

  async getBookings(token: string, options?: { status?: string; limit?: number; offset?: number }) {
    return this.handleRequest(async () => {
      const userId = await this.getUserIdFromToken(token);

      let query = this.supabase.getAdminClient()
        .schema('backend')
        .from('booking')
        .select('id, transaction_id, status, booking_number, order_id, created_at, updated_at, reservation_details, pdf_path')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options?.status) query = query.eq('status', options.status);
      if (options?.limit) query = query.limit(options.limit);
      if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);

      const { data, error } = await query;
      if (error) this.throwError('BOOKINGS_ERROR', error.message, HttpStatus.BAD_REQUEST);

      return { success: true, data };
    }, 'BOOKINGS_ERROR', 'Rezervasyonlar getirilemedi');
  }

  async getBooking(token: string, id: string) {
    return this.handleRequest(async () => {
      const userId = await this.getUserIdFromToken(token);

      const { data, error } = await this.supabase.getAdminClient()
        .schema('backend')
        .from('booking')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error || !data) this.throwError('BOOKING_NOT_FOUND', 'Rezervasyon bulunamadı', HttpStatus.NOT_FOUND);

      return { success: true, data };
    }, 'BOOKINGS_ERROR', 'Rezervasyon getirilemedi');
  }

  // ==================== TRANSACTIONS ====================

  async getTransactions(token: string, options?: { limit?: number; offset?: number }) {
    return this.handleRequest(async () => {
      const userId = await this.getUserIdFromToken(token);

      let query = this.supabase.getAdminClient()
        .from('user_transaction')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options?.limit) query = query.limit(options.limit);
      if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);

      const { data, error } = await query;
      if (error) this.throwError('TRANSACTIONS_ERROR', error.message, HttpStatus.BAD_REQUEST);

      return { success: true, data };
    }, 'TRANSACTIONS_ERROR', 'İşlemler getirilemedi');
  }

  async getTransaction(token: string, id: string) {
    return this.handleRequest(async () => {
      const userId = await this.getUserIdFromToken(token);

      const { data, error } = await this.supabase.getAdminClient()
        .from('user_transaction')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error || !data) this.throwError('TRANSACTION_NOT_FOUND', 'İşlem bulunamadı', HttpStatus.NOT_FOUND);

      return { success: true, data };
    }, 'TRANSACTIONS_ERROR', 'İşlem getirilemedi');
  }

  // ==================== USER DISCOUNTS ====================

  async getUserDiscounts(token: string, options?: { activeOnly?: boolean }) {
    return this.handleRequest(async () => {
      const userId = await this.getUserIdFromToken(token);

      let query = this.supabase.getAdminClient()
        .from('user_discount')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options?.activeOnly) {
        query = query.eq('is_used', false).gte('expires_at', new Date().toISOString());
      }

      const { data, error } = await query;
      if (error) this.throwError('USER_DISCOUNTS_ERROR', error.message, HttpStatus.BAD_REQUEST);

      return { success: true, data };
    }, 'USER_DISCOUNTS_ERROR', 'İndirimler getirilemedi');
  }

  async validateUserDiscount(token: string, code: string) {
    return this.handleRequest(async () => {
      const userId = await this.getUserIdFromToken(token);

      const { data, error } = await this.supabase.getAdminClient()
        .from('user_discount')
        .select('*')
        .eq('user_id', userId)
        .eq('code', code.toUpperCase())
        .eq('is_used', false)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (error || !data) this.throwError('DISCOUNT_INVALID', 'Geçersiz veya kullanılmış indirim kodu', HttpStatus.NOT_FOUND);

      return { success: true, data };
    }, 'USER_DISCOUNTS_ERROR', 'İndirim kodu doğrulanamadı');
  }

  // ==================== AVATAR ====================

  async uploadAvatar(token: string, file: Express.Multer.File) {
    return this.handleRequest(async () => {
      const userId = await this.getUserIdFromToken(token);

      if (!file) this.throwError('AVATAR_ERROR', 'Dosya bulunamadı', HttpStatus.BAD_REQUEST);
      if (file.size > 1048576) this.throwError('AVATAR_ERROR', 'Dosya boyutu 1 MB\'ı geçemez', HttpStatus.BAD_REQUEST);

      const allowedTypes = ['image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.mimetype)) {
        this.throwError('AVATAR_ERROR', 'Sadece JPEG ve PNG dosyaları kabul edilir', HttpStatus.BAD_REQUEST);
      }

      const ext = file.mimetype === 'image/png' ? 'png' : 'jpg';
      const filePath = `${userId}/avatar.${ext}`;

      // Mevcut avatar'ları sil ve yenisini yükle
      await this.supabase.getAdminClient().storage
        .from('avatars')
        .remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`]);

      const { error: uploadError } = await this.supabase.getAdminClient().storage
        .from('avatars')
        .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: true });

      if (uploadError) {
        this.logger.error({ message: 'Avatar yükleme hatası', error: uploadError.message });
        this.throwError('AVATAR_ERROR', 'Avatar yüklenemedi', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const { data: { publicUrl } } = this.supabase.getAdminClient().storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await this.supabase.getAdminClient()
        .from('user_profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updateError) {
        this.logger.error({ message: 'Profil güncelleme hatası', error: updateError.message });
        this.throwError('AVATAR_ERROR', 'Avatar URL kaydedilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      this.logger.log({ message: 'Avatar yüklendi', userId });
      return { success: true, data: { avatar_url: publicUrl } };
    }, 'AVATAR_ERROR', 'Avatar yüklenemedi');
  }

  async deleteAvatar(token: string) {
    return this.handleRequest(async () => {
      const userId = await this.getUserIdFromToken(token);

      const { error: deleteError } = await this.supabase.getAdminClient().storage
        .from('avatars')
        .remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`]);

      if (deleteError) {
        this.logger.error({ message: 'Avatar silme hatası', error: deleteError.message });
        this.throwError('AVATAR_ERROR', 'Avatar silinemedi', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const { error: updateError } = await this.supabase.getAdminClient()
        .from('user_profiles')
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updateError) {
        this.logger.error({ message: 'Profil güncelleme hatası', error: updateError.message });
        this.throwError('AVATAR_ERROR', 'Avatar URL temizlenemedi', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      this.logger.log({ message: 'Avatar silindi', userId });
      return { success: true, message: 'Avatar silindi' };
    }, 'AVATAR_ERROR', 'Avatar silinemedi');
  }
}
