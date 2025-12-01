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

  // Token'dan user ID çıkar
  async getUserIdFromToken(token: string): Promise<string> {
    if (!token) {
      this.throwError('UNAUTHORIZED', 'Token bulunamadı', HttpStatus.UNAUTHORIZED);
    }

    const { data: { user }, error } = await this.supabase.getAnonClient().auth.getUser(token);
    
    if (error || !user) {
      this.throwError('UNAUTHORIZED', 'Geçersiz token', HttpStatus.UNAUTHORIZED);
    }

    return user.id;
  }

  // ==================== EMAIL CHECK (PUBLIC) ====================

  async checkEmail(email: string) {
    try {
      if (!email) {
        this.throwError('EMAIL_REQUIRED', 'Email adresi gereklidir', HttpStatus.BAD_REQUEST);
      }

      // user_profiles tablosunda email kontrolü
      const { data, error } = await this.supabase.getAdminClient()
        .from('user_profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (error) {
        this.logger.error({ message: 'Email kontrol hatası', error: error.message });
        this.throwError('CHECK_EMAIL_ERROR', 'Email kontrolü yapılamadı', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return { 
        success: true, 
        data: { 
          exists: !!data,
          email: email.toLowerCase()
        } 
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Email kontrol hatası', error: error.message });
      this.throwError('CHECK_EMAIL_ERROR', 'Email kontrolü yapılamadı', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ==================== PROFILE ====================

  async getProfile(token: string) {
    try {
      const userId = await this.getUserIdFromToken(token);

      const { data, error } = await this.supabase.getAdminClient()
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        this.throwError('PROFILE_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Profil getirme hatası', error: error.message });
      this.throwError('PROFILE_ERROR', 'Profil getirilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateProfile(token: string, dto: UpdateProfileDto) {
    try {
      const userId = await this.getUserIdFromToken(token);

      const { data, error } = await this.supabase.getAdminClient()
        .from('user_profiles')
        .update({ ...dto, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        this.throwError('PROFILE_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      this.logger.log({ message: 'Profil güncellendi', userId });

      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Profil güncelleme hatası', error: error.message });
      this.throwError('PROFILE_ERROR', 'Profil güncellenemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ==================== FAVORITES ====================

  async getFavorites(token: string, type?: string) {
    try {
      const userId = await this.getUserIdFromToken(token);

      let query = this.supabase.getAdminClient()
        .from('user_favorites')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) {
        this.throwError('FAVORITES_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Favoriler getirme hatası', error: error.message });
      this.throwError('FAVORITES_ERROR', 'Favoriler getirilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async addFavorite(token: string, dto: CreateFavoriteDto) {
    try {
      const userId = await this.getUserIdFromToken(token);

      const { data, error } = await this.supabase.getAdminClient()
        .from('user_favorites')
        .insert([{ ...dto, user_id: userId }])
        .select()
        .single();

      if (error) {
        this.throwError('FAVORITES_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      this.logger.log({ message: 'Favori eklendi', userId, type: dto.type });

      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Favori ekleme hatası', error: error.message });
      this.throwError('FAVORITES_ERROR', 'Favori eklenemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async removeFavorite(token: string, id: string) {
    try {
      const userId = await this.getUserIdFromToken(token);

      const { error } = await this.supabase.getAdminClient()
        .from('user_favorites')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        this.throwError('FAVORITES_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      this.logger.log({ message: 'Favori silindi', userId, favoriteId: id });

      return { success: true, message: 'Favori silindi' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Favori silme hatası', error: error.message });
      this.throwError('FAVORITES_ERROR', 'Favori silinemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ==================== TRAVELLERS ====================

  async getTravellers(token: string) {
    try {
      const userId = await this.getUserIdFromToken(token);

      const { data, error } = await this.supabase.getAdminClient()
        .from('user_travellers')
        .select('*')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        this.throwError('TRAVELLERS_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Yolcular getirme hatası', error: error.message });
      this.throwError('TRAVELLERS_ERROR', 'Yolcular getirilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getTraveller(token: string, id: string) {
    try {
      const userId = await this.getUserIdFromToken(token);

      const { data, error } = await this.supabase.getAdminClient()
        .from('user_travellers')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        this.throwError('TRAVELLER_NOT_FOUND', 'Yolcu bulunamadı', HttpStatus.NOT_FOUND);
      }

      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Yolcu getirme hatası', error: error.message });
      this.throwError('TRAVELLERS_ERROR', 'Yolcu getirilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async addTraveller(token: string, dto: CreateTravellerDto) {
    try {
      const userId = await this.getUserIdFromToken(token);

      const { data, error } = await this.supabase.getAdminClient()
        .from('user_travellers')
        .insert([{ ...dto, user_id: userId }])
        .select()
        .single();

      if (error) {
        this.throwError('TRAVELLERS_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      this.logger.log({ message: 'Yolcu eklendi', userId, travellerId: data.id });

      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Yolcu ekleme hatası', error: error.message });
      this.throwError('TRAVELLERS_ERROR', 'Yolcu eklenemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateTraveller(token: string, id: string, dto: UpdateTravellerDto) {
    try {
      const userId = await this.getUserIdFromToken(token);

      const { data, error } = await this.supabase.getAdminClient()
        .from('user_travellers')
        .update({ ...dto, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        this.throwError('TRAVELLERS_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      this.logger.log({ message: 'Yolcu güncellendi', userId, travellerId: id });

      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Yolcu güncelleme hatası', error: error.message });
      this.throwError('TRAVELLERS_ERROR', 'Yolcu güncellenemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async removeTraveller(token: string, id: string) {
    try {
      const userId = await this.getUserIdFromToken(token);

      const { error } = await this.supabase.getAdminClient()
        .from('user_travellers')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        this.throwError('TRAVELLERS_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      this.logger.log({ message: 'Yolcu silindi', userId, travellerId: id });

      return { success: true, message: 'Yolcu silindi' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Yolcu silme hatası', error: error.message });
      this.throwError('TRAVELLERS_ERROR', 'Yolcu silinemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ==================== NOTIFICATIONS ====================

  async getNotifications(token: string, options?: { unreadOnly?: boolean; limit?: number }) {
    try {
      const userId = await this.getUserIdFromToken(token);

      let query = this.supabase.getAdminClient()
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options?.unreadOnly) {
        query = query.eq('is_read', false);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        this.throwError('NOTIFICATIONS_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      const unreadCount = data?.filter(n => !n.is_read).length || 0;

      return { success: true, data, unreadCount };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Bildirimler getirme hatası', error: error.message });
      this.throwError('NOTIFICATIONS_ERROR', 'Bildirimler getirilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async markNotificationAsRead(token: string, id: string) {
    try {
      const userId = await this.getUserIdFromToken(token);

      const { error } = await this.supabase.getAdminClient()
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        this.throwError('NOTIFICATIONS_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      return { success: true, message: 'Bildirim okundu olarak işaretlendi' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Bildirim güncelleme hatası', error: error.message });
      this.throwError('NOTIFICATIONS_ERROR', 'Bildirim güncellenemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async markAllNotificationsAsRead(token: string) {
    try {
      const userId = await this.getUserIdFromToken(token);

      const { error } = await this.supabase.getAdminClient()
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        this.throwError('NOTIFICATIONS_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      return { success: true, message: 'Tüm bildirimler okundu olarak işaretlendi' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Bildirimler güncelleme hatası', error: error.message });
      this.throwError('NOTIFICATIONS_ERROR', 'Bildirimler güncellenemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ==================== BOOKINGS ====================

  async getBookings(token: string, options?: { status?: string; limit?: number; offset?: number }) {
    try {
      const userId = await this.getUserIdFromToken(token);

      let query = this.supabase.getAdminClient()
        .schema('backend')
        .from('booking')
        .select('id, transaction_id, status, booking_number, order_id, created_at, updated_at, reservation_details, pdf_path')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        this.throwError('BOOKINGS_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Rezervasyonlar getirme hatası', error: error.message });
      this.throwError('BOOKINGS_ERROR', 'Rezervasyonlar getirilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getBooking(token: string, id: string) {
    try {
      const userId = await this.getUserIdFromToken(token);

      const { data, error } = await this.supabase.getAdminClient()
        .schema('backend')
        .from('booking')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        this.throwError('BOOKING_NOT_FOUND', 'Rezervasyon bulunamadı', HttpStatus.NOT_FOUND);
      }

      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Rezervasyon getirme hatası', error: error.message });
      this.throwError('BOOKINGS_ERROR', 'Rezervasyon getirilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ==================== TRANSACTIONS ====================

  async getTransactions(token: string, options?: { limit?: number; offset?: number }) {
    try {
      const userId = await this.getUserIdFromToken(token);

      let query = this.supabase.getAdminClient()
        .from('user_transaction')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        this.throwError('TRANSACTIONS_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'İşlemler getirme hatası', error: error.message });
      this.throwError('TRANSACTIONS_ERROR', 'İşlemler getirilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getTransaction(token: string, id: string) {
    try {
      const userId = await this.getUserIdFromToken(token);

      const { data, error } = await this.supabase.getAdminClient()
        .from('user_transaction')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        this.throwError('TRANSACTION_NOT_FOUND', 'İşlem bulunamadı', HttpStatus.NOT_FOUND);
      }

      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'İşlem getirme hatası', error: error.message });
      this.throwError('TRANSACTIONS_ERROR', 'İşlem getirilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ==================== USER DISCOUNTS ====================

  async getUserDiscounts(token: string, options?: { activeOnly?: boolean }) {
    try {
      const userId = await this.getUserIdFromToken(token);

      let query = this.supabase.getAdminClient()
        .from('user_discount')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options?.activeOnly) {
        query = query
          .eq('is_used', false)
          .gte('expires_at', new Date().toISOString());
      }

      const { data, error } = await query;

      if (error) {
        this.throwError('USER_DISCOUNTS_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Kullanıcı indirimleri getirme hatası', error: error.message });
      this.throwError('USER_DISCOUNTS_ERROR', 'İndirimler getirilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async validateUserDiscount(token: string, code: string) {
    try {
      const userId = await this.getUserIdFromToken(token);

      const { data, error } = await this.supabase.getAdminClient()
        .from('user_discount')
        .select('*')
        .eq('user_id', userId)
        .eq('code', code.toUpperCase())
        .eq('is_used', false)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        this.throwError('DISCOUNT_INVALID', 'Geçersiz veya kullanılmış indirim kodu', HttpStatus.NOT_FOUND);
      }

      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Kullanıcı indirimi doğrulama hatası', error: error.message });
      this.throwError('USER_DISCOUNTS_ERROR', 'İndirim kodu doğrulanamadı', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ==================== AVATAR ====================

  async uploadAvatar(token: string, file: Express.Multer.File) {
    try {
      const userId = await this.getUserIdFromToken(token);

      // Dosya kontrolü
      if (!file) {
        this.throwError('AVATAR_ERROR', 'Dosya bulunamadı', HttpStatus.BAD_REQUEST);
      }

      // Dosya boyutu kontrolü (1 MB)
      if (file.size > 1048576) {
        this.throwError('AVATAR_ERROR', 'Dosya boyutu 1 MB\'ı geçemez', HttpStatus.BAD_REQUEST);
      }

      // MIME type kontrolü
      const allowedTypes = ['image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.mimetype)) {
        this.throwError('AVATAR_ERROR', 'Sadece JPEG ve PNG dosyaları kabul edilir', HttpStatus.BAD_REQUEST);
      }

      // Dosya uzantısını belirle
      const ext = file.mimetype === 'image/png' ? 'png' : 'jpg';
      const filePath = `${userId}/avatar.${ext}`;

      // Önce mevcut avatar'ı sil (varsa)
      await this.supabase.getAdminClient().storage
        .from('avatars')
        .remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`]);

      // Yeni dosyayı yükle
      const { error: uploadError } = await this.supabase.getAdminClient().storage
        .from('avatars')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        this.logger.error({ message: 'Avatar yükleme hatası', error: uploadError.message });
        this.throwError('AVATAR_ERROR', 'Avatar yüklenemedi', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Public URL oluştur
      const { data: { publicUrl } } = this.supabase.getAdminClient().storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Profile'a URL'yi kaydet
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
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Avatar yükleme hatası', error: error.message });
      this.throwError('AVATAR_ERROR', 'Avatar yüklenemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteAvatar(token: string) {
    try {
      const userId = await this.getUserIdFromToken(token);

      // Her iki olası dosyayı da sil
      const { error: deleteError } = await this.supabase.getAdminClient().storage
        .from('avatars')
        .remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`]);

      if (deleteError) {
        this.logger.error({ message: 'Avatar silme hatası', error: deleteError.message });
        this.throwError('AVATAR_ERROR', 'Avatar silinemedi', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Profile'dan URL'yi temizle
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
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Avatar silme hatası', error: error.message });
      this.throwError('AVATAR_ERROR', 'Avatar silinemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

