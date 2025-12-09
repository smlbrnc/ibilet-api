import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/services/supabase.service';
import { LoggerService } from '../common/logger/logger.service';
import {
  UpdateProfileDto,
  CreateFavoriteDto,
  CreateTravellerDto,
  UpdateTravellerDto,
  CreateNotificationDto,
  CreateGeneralNotificationDto,
} from './dto';
import { parseUserAgent, formatSessionDisplay } from '../common/utils/user-agent.util';

@Injectable()
export class UserService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
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

  // ==================== EMAIL CHECK (PUBLIC) ====================

  async checkEmail(email: string) {
    return this.handleRequest(
      async () => {
        if (!email)
          this.throwError('EMAIL_REQUIRED', 'Email adresi gereklidir', HttpStatus.BAD_REQUEST);

        const { data, error } = await this.supabase
          .getAdminClient()
          .from('user_profiles')
          .select('id')
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (error) {
          this.logger.error({ message: 'Email kontrol hatası', error: error.message });
          this.throwError(
            'CHECK_EMAIL_ERROR',
            'Email kontrolü yapılamadı',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }

        return { success: true, data: { exists: !!data, email: email.toLowerCase() } };
      },
      'CHECK_EMAIL_ERROR',
      'Email kontrolü yapılamadı',
    );
  }

  // ==================== PROFILE ====================

  async getProfile(userId: string) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) this.throwError('PROFILE_ERROR', error.message, HttpStatus.BAD_REQUEST);

        return { success: true, data };
      },
      'PROFILE_ERROR',
      'Profil getirilemedi',
    );
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('user_profiles')
          .update({ ...dto, updated_at: new Date().toISOString() })
          .eq('id', userId)
          .select()
          .single();

        if (error) this.throwError('PROFILE_ERROR', error.message, HttpStatus.BAD_REQUEST);

        this.logger.log({ message: 'Profil güncellendi', userId });
        return { success: true, data };
      },
      'PROFILE_ERROR',
      'Profil güncellenemedi',
    );
  }

  // ==================== FAVORITES ====================

  async getFavorites(userId: string, type?: string) {
    return this.handleRequest(
      async () => {
        let query = this.supabase
          .getAdminClient()
          .from('user_favorites')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (type) query = query.eq('type', type);

        const { data, error } = await query;
        if (error) this.throwError('FAVORITES_ERROR', error.message, HttpStatus.BAD_REQUEST);

        return { success: true, data };
      },
      'FAVORITES_ERROR',
      'Favoriler getirilemedi',
    );
  }

  async addFavorite(userId: string, dto: CreateFavoriteDto) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('user_favorites')
          .insert([{ ...dto, user_id: userId }])
          .select()
          .single();

        if (error) this.throwError('FAVORITES_ERROR', error.message, HttpStatus.BAD_REQUEST);

        this.logger.log({ message: 'Favori eklendi', userId, type: dto.type });
        return { success: true, data };
      },
      'FAVORITES_ERROR',
      'Favori eklenemedi',
    );
  }

  async removeFavorite(userId: string, id: string) {
    return this.handleRequest(
      async () => {
        const { error } = await this.supabase
          .getAdminClient()
          .from('user_favorites')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (error) this.throwError('FAVORITES_ERROR', error.message, HttpStatus.BAD_REQUEST);

        this.logger.log({ message: 'Favori silindi', userId, favoriteId: id });
        return { success: true, message: 'Favori silindi' };
      },
      'FAVORITES_ERROR',
      'Favori silinemedi',
    );
  }

  // ==================== TRAVELLERS ====================

  async getTravellers(userId: string) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('user_travellers')
          .select('*')
          .eq('user_id', userId)
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) this.throwError('TRAVELLERS_ERROR', error.message, HttpStatus.BAD_REQUEST);

        return { success: true, data };
      },
      'TRAVELLERS_ERROR',
      'Yolcular getirilemedi',
    );
  }

  async getTraveller(userId: string, id: string) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('user_travellers')
          .select('*')
          .eq('id', id)
          .eq('user_id', userId)
          .single();

        if (error || !data)
          this.throwError('TRAVELLER_NOT_FOUND', 'Yolcu bulunamadı', HttpStatus.NOT_FOUND);

        return { success: true, data };
      },
      'TRAVELLERS_ERROR',
      'Yolcu getirilemedi',
    );
  }

  async addTraveller(userId: string, dto: CreateTravellerDto) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('user_travellers')
          .insert([{ ...dto, user_id: userId }])
          .select()
          .single();

        if (error) this.throwError('TRAVELLERS_ERROR', error.message, HttpStatus.BAD_REQUEST);

        this.logger.log({ message: 'Yolcu eklendi', userId, travellerId: data.id });
        return { success: true, data };
      },
      'TRAVELLERS_ERROR',
      'Yolcu eklenemedi',
    );
  }

  async updateTraveller(userId: string, id: string, dto: UpdateTravellerDto) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('user_travellers')
          .update({ ...dto, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) this.throwError('TRAVELLERS_ERROR', error.message, HttpStatus.BAD_REQUEST);

        this.logger.log({ message: 'Yolcu güncellendi', userId, travellerId: id });
        return { success: true, data };
      },
      'TRAVELLERS_ERROR',
      'Yolcu güncellenemedi',
    );
  }

  async removeTraveller(userId: string, id: string) {
    return this.handleRequest(
      async () => {
        const { error } = await this.supabase
          .getAdminClient()
          .from('user_travellers')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (error) this.throwError('TRAVELLERS_ERROR', error.message, HttpStatus.BAD_REQUEST);

        this.logger.log({ message: 'Yolcu silindi', userId, travellerId: id });
        return { success: true, message: 'Yolcu silindi' };
      },
      'TRAVELLERS_ERROR',
      'Yolcu silinemedi',
    );
  }

  // ==================== NOTIFICATIONS ====================

  async getNotifications(userId: string, options?: { unreadOnly?: boolean; limit?: number }) {
    return this.handleRequest(
      async () => {
        let query = this.supabase
          .getAdminClient()
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (options?.unreadOnly) query = query.eq('is_read', false);
        if (options?.limit) query = query.limit(options.limit);

        const { data, error } = await query;
        if (error) this.throwError('NOTIFICATIONS_ERROR', error.message, HttpStatus.BAD_REQUEST);

        return { success: true, data, unreadCount: data?.filter((n) => !n.is_read).length || 0 };
      },
      'NOTIFICATIONS_ERROR',
      'Bildirimler getirilemedi',
    );
  }

  async markNotificationAsRead(userId: string, id: string) {
    return this.handleRequest(
      async () => {
        const { error } = await this.supabase
          .getAdminClient()
          .from('notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', userId);

        if (error) this.throwError('NOTIFICATIONS_ERROR', error.message, HttpStatus.BAD_REQUEST);

        return { success: true, message: 'Bildirim okundu olarak işaretlendi' };
      },
      'NOTIFICATIONS_ERROR',
      'Bildirim güncellenemedi',
    );
  }

  async markAllNotificationsAsRead(userId: string) {
    return this.handleRequest(
      async () => {
        const { error } = await this.supabase
          .getAdminClient()
          .from('notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('is_read', false);

        if (error) this.throwError('NOTIFICATIONS_ERROR', error.message, HttpStatus.BAD_REQUEST);

        return { success: true, message: 'Tüm bildirimler okundu olarak işaretlendi' };
      },
      'NOTIFICATIONS_ERROR',
      'Bildirimler güncellenemedi',
    );
  }

  private async checkAdminStatus(user: any): Promise<boolean> {
    // 1. User metadata'da is_admin kontrolü
    if (user.user_metadata?.is_admin === true) {
      return true;
    }

    // 2. Environment variable'dan admin email listesi kontrolü
    const adminEmails = this.config.get<string>('admin.emails');
    if (adminEmails) {
      const emailList = adminEmails.split(',').map((email) => email.trim().toLowerCase());
      if (user.email && emailList.includes(user.email.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  async sendNotification(currentUserId: string, dto: CreateNotificationDto) {
    return this.handleRequest(
      async () => {
        // Admin kontrolü
        const { data: currentUser } = await this.supabase
          .getAdminClient()
          .auth.admin.getUserById(currentUserId);

        if (!currentUser?.user) {
          this.throwError('USER_NOT_FOUND', 'Kullanıcı bulunamadı', HttpStatus.NOT_FOUND);
        }

        const isAdmin = await this.checkAdminStatus(currentUser.user);
        if (!isAdmin) {
          this.throwError(
            'ADMIN_REQUIRED',
            'Bu işlem için admin yetkisi gereklidir',
            HttpStatus.FORBIDDEN,
          );
        }

        // Kullanıcının varlığını kontrol et
        const { data: user, error: userError } = await this.supabase
          .getAdminClient()
          .from('user_profiles')
          .select('id')
          .eq('id', dto.user_id)
          .maybeSingle();

        if (userError) {
          this.throwError('USER_NOT_FOUND', 'Kullanıcı bulunamadı', HttpStatus.NOT_FOUND);
        }

        if (!user) {
          this.throwError('USER_NOT_FOUND', 'Kullanıcı bulunamadı', HttpStatus.NOT_FOUND);
        }

        // Bildirim oluştur
        const notificationData = {
          user_id: dto.user_id,
          title: dto.title,
          message: dto.message || null,
          type: dto.type || null,
          action_url: dto.action_url || null,
          data: dto.data || null,
          is_read: false,
        };

        const { data, error } = await this.supabase
          .getAdminClient()
          .from('notifications')
          .insert([notificationData])
          .select()
          .single();

        if (error) this.throwError('NOTIFICATIONS_ERROR', error.message, HttpStatus.BAD_REQUEST);

        this.logger.log({
          message: 'Bildirim gönderildi',
          userId: dto.user_id,
          notificationId: data.id,
        });

        return { success: true, data };
      },
      'NOTIFICATIONS_ERROR',
      'Bildirim gönderilemedi',
    );
  }

  async sendGeneralNotification(currentUserId: string, dto: CreateGeneralNotificationDto) {
    return this.handleRequest(
      async () => {
        // Admin kontrolü
        const { data: currentUser } = await this.supabase
          .getAdminClient()
          .auth.admin.getUserById(currentUserId);

        if (!currentUser?.user) {
          this.throwError('USER_NOT_FOUND', 'Kullanıcı bulunamadı', HttpStatus.NOT_FOUND);
        }

        const isAdmin = await this.checkAdminStatus(currentUser.user);
        if (!isAdmin) {
          this.throwError(
            'ADMIN_REQUIRED',
            'Bu işlem için admin yetkisi gereklidir',
            HttpStatus.FORBIDDEN,
          );
        }

        // Tüm kullanıcıları al
        const { data: users, error: usersError } = await this.supabase
          .getAdminClient()
          .from('user_profiles')
          .select('id');

        if (usersError) {
          this.throwError('USERS_FETCH_ERROR', usersError.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (!users || users.length === 0) {
          return {
            success: true,
            message: 'Gönderilecek kullanıcı bulunamadı',
            sentCount: 0,
          };
        }

        // Batch insert için bildirim verilerini hazırla
        const notifications = users.map((user) => ({
          user_id: user.id,
          title: dto.title,
          message: dto.message || null,
          type: dto.type || null,
          action_url: dto.action_url || null,
          data: dto.data || null,
          is_read: false,
        }));

        // Supabase batch insert (PostgreSQL limit: ~1000 rows per insert)
        // Büyük kullanıcı listeleri için chunk'lara böl
        const chunkSize = 1000;
        let totalInserted = 0;

        for (let i = 0; i < notifications.length; i += chunkSize) {
          const chunk = notifications.slice(i, i + chunkSize);
          const { error: insertError } = await this.supabase
            .getAdminClient()
            .from('notifications')
            .insert(chunk);

          if (insertError) {
            this.logger.error({
              message: 'Genel bildirim gönderim hatası',
              error: insertError.message,
              chunkIndex: i,
            });
            // Hata olsa bile diğer chunk'ları denemeye devam et
            continue;
          }

          totalInserted += chunk.length;
        }

        this.logger.log({
          message: 'Genel bildirim gönderildi',
          totalUsers: users.length,
          sentCount: totalInserted,
        });

        return {
          success: true,
          message: 'Genel bildirim gönderildi',
          totalUsers: users.length,
          sentCount: totalInserted,
        };
      },
      'NOTIFICATIONS_ERROR',
      'Genel bildirim gönderilemedi',
    );
  }

  // ==================== BOOKINGS ====================

  async getBookings(
    userId: string,
    options?: { status?: string; limit?: number; offset?: number },
  ) {
    return this.handleRequest(
      async () => {
        let query = this.supabase
          .getAdminClient()
          .schema('backend')
          .from('booking')
          .select(
            'id, transaction_id, status, booking_number, order_id, created_at, updated_at, reservation_details, pdf_path',
          )
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (options?.status) query = query.eq('status', options.status);
        if (options?.limit) query = query.limit(options.limit);
        if (options?.offset)
          query = query.range(options.offset, options.offset + (options.limit || 10) - 1);

        const { data, error } = await query;
        if (error) this.throwError('BOOKINGS_ERROR', error.message, HttpStatus.BAD_REQUEST);

        return { success: true, data };
      },
      'BOOKINGS_ERROR',
      'Rezervasyonlar getirilemedi',
    );
  }

  async getBooking(userId: string, id: string) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .schema('backend')
          .from('booking')
          .select('*')
          .eq('id', id)
          .eq('user_id', userId)
          .single();

        if (error || !data)
          this.throwError('BOOKING_NOT_FOUND', 'Rezervasyon bulunamadı', HttpStatus.NOT_FOUND);

        return { success: true, data };
      },
      'BOOKINGS_ERROR',
      'Rezervasyon getirilemedi',
    );
  }

  // ==================== TRANSACTIONS ====================

  async getTransactions(userId: string, options?: { limit?: number; offset?: number }) {
    return this.handleRequest(
      async () => {
        let query = this.supabase
          .getAdminClient()
          .from('user_transaction')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (options?.limit) query = query.limit(options.limit);
        if (options?.offset)
          query = query.range(options.offset, options.offset + (options.limit || 10) - 1);

        const { data, error } = await query;
        if (error) this.throwError('TRANSACTIONS_ERROR', error.message, HttpStatus.BAD_REQUEST);

        return { success: true, data };
      },
      'TRANSACTIONS_ERROR',
      'İşlemler getirilemedi',
    );
  }

  async getTransaction(userId: string, id: string) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('user_transaction')
          .select('*')
          .eq('id', id)
          .eq('user_id', userId)
          .single();

        if (error || !data)
          this.throwError('TRANSACTION_NOT_FOUND', 'İşlem bulunamadı', HttpStatus.NOT_FOUND);

        return { success: true, data };
      },
      'TRANSACTIONS_ERROR',
      'İşlem getirilemedi',
    );
  }

  // ==================== USER DISCOUNTS ====================

  async getUserDiscounts(userId: string, options?: { activeOnly?: boolean }) {
    return this.handleRequest(
      async () => {
        let query = this.supabase
          .getAdminClient()
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
      },
      'USER_DISCOUNTS_ERROR',
      'İndirimler getirilemedi',
    );
  }

  async validateUserDiscount(userId: string, code: string) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('user_discount')
          .select('*')
          .eq('user_id', userId)
          .eq('code', code.toUpperCase())
          .eq('is_used', false)
          .gte('expires_at', new Date().toISOString())
          .single();

        if (error || !data)
          this.throwError(
            'DISCOUNT_INVALID',
            'Geçersiz veya kullanılmış indirim kodu',
            HttpStatus.NOT_FOUND,
          );

        return { success: true, data };
      },
      'USER_DISCOUNTS_ERROR',
      'İndirim kodu doğrulanamadı',
    );
  }

  // ==================== AVATAR ====================

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    return this.handleRequest(
      async () => {
        if (!file) this.throwError('AVATAR_ERROR', 'Dosya bulunamadı', HttpStatus.BAD_REQUEST);
        if (file.size > 1048576)
          this.throwError('AVATAR_ERROR', "Dosya boyutu 1 MB'ı geçemez", HttpStatus.BAD_REQUEST);

        const allowedTypes = ['image/jpeg', 'image/png'];
        if (!allowedTypes.includes(file.mimetype)) {
          this.throwError(
            'AVATAR_ERROR',
            'Sadece JPEG ve PNG dosyaları kabul edilir',
            HttpStatus.BAD_REQUEST,
          );
        }

        const ext = file.mimetype === 'image/png' ? 'png' : 'jpg';
        const filePath = `${userId}/avatar.${ext}`;

        // Mevcut avatar'ları sil ve yenisini yükle
        await this.supabase
          .getAdminClient()
          .storage.from('avatars')
          .remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`]);

        const { error: uploadError } = await this.supabase
          .getAdminClient()
          .storage.from('avatars')
          .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: true });

        if (uploadError) {
          this.logger.error({ message: 'Avatar yükleme hatası', error: uploadError.message });
          this.throwError('AVATAR_ERROR', 'Avatar yüklenemedi', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const {
          data: { publicUrl },
        } = this.supabase.getAdminClient().storage.from('avatars').getPublicUrl(filePath);

        const { error: updateError } = await this.supabase
          .getAdminClient()
          .from('user_profiles')
          .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
          .eq('id', userId);

        if (updateError) {
          this.logger.error({ message: 'Profil güncelleme hatası', error: updateError.message });
          this.throwError(
            'AVATAR_ERROR',
            'Avatar URL kaydedilemedi',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }

        this.logger.log({ message: 'Avatar yüklendi', userId });
        return { success: true, data: { avatar_url: publicUrl } };
      },
      'AVATAR_ERROR',
      'Avatar yüklenemedi',
    );
  }

  async deleteAvatar(userId: string) {
    return this.handleRequest(
      async () => {
        const { error: deleteError } = await this.supabase
          .getAdminClient()
          .storage.from('avatars')
          .remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`]);

        if (deleteError) {
          this.logger.error({ message: 'Avatar silme hatası', error: deleteError.message });
          this.throwError('AVATAR_ERROR', 'Avatar silinemedi', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const { error: updateError } = await this.supabase
          .getAdminClient()
          .from('user_profiles')
          .update({ avatar_url: null, updated_at: new Date().toISOString() })
          .eq('id', userId);

        if (updateError) {
          this.logger.error({ message: 'Profil güncelleme hatası', error: updateError.message });
          this.throwError(
            'AVATAR_ERROR',
            'Avatar URL temizlenemedi',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }

        this.logger.log({ message: 'Avatar silindi', userId });
        return { success: true, message: 'Avatar silindi' };
      },
      'AVATAR_ERROR',
      'Avatar silinemedi',
    );
  }

  // ==================== SESSIONS ====================

  async getSessions(userId: string, currentSessionId?: string) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .rpc('get_user_sessions', { p_user_id: userId });

        if (error) this.throwError('SESSIONS_ERROR', error.message, HttpStatus.BAD_REQUEST);

        const sessions = (data || []).map(
          (session: {
            id: string;
            user_agent: string;
            ip: string;
            created_at: string;
            refreshed_at: string;
            tag: string;
          }) => {
            const parsed = parseUserAgent(session.user_agent);
            return {
              id: session.id,
              device: parsed.device,
              browser: parsed.browser,
              os: parsed.os,
              display: formatSessionDisplay(parsed),
              ip: session.ip,
              created_at: session.created_at,
              last_active: session.refreshed_at || session.created_at,
              is_current: currentSessionId ? session.id === currentSessionId : false,
              tag: session.tag,
            };
          },
        );

        return { success: true, data: sessions };
      },
      'SESSIONS_ERROR',
      'Oturumlar getirilemedi',
    );
  }

  async terminateSession(userId: string, sessionId: string) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .rpc('terminate_user_session', { p_user_id: userId, p_session_id: sessionId });

        if (error) this.throwError('SESSIONS_ERROR', error.message, HttpStatus.BAD_REQUEST);
        if (!data) this.throwError('SESSION_NOT_FOUND', 'Oturum bulunamadı', HttpStatus.NOT_FOUND);

        this.logger.log({ message: 'Oturum sonlandırıldı', userId, sessionId });
        return { success: true, message: 'Oturum sonlandırıldı' };
      },
      'SESSIONS_ERROR',
      'Oturum sonlandırılamadı',
    );
  }

  async terminateOtherSessions(userId: string, currentSessionId: string) {
    return this.handleRequest(
      async () => {
        if (!currentSessionId) {
          this.throwError('SESSIONS_ERROR', 'Mevcut oturum ID gerekli', HttpStatus.BAD_REQUEST);
        }

        const { data, error } = await this.supabase
          .getAdminClient()
          .rpc('terminate_other_sessions', {
            p_user_id: userId,
            p_current_session_id: currentSessionId,
          });

        if (error) this.throwError('SESSIONS_ERROR', error.message, HttpStatus.BAD_REQUEST);

        this.logger.log({
          message: 'Diğer oturumlar sonlandırıldı',
          userId,
          count: data,
          keptSessionId: currentSessionId,
        });
        return {
          success: true,
          message: 'Diğer tüm oturumlar sonlandırıldı',
          terminatedCount: data,
        };
      },
      'SESSIONS_ERROR',
      'Oturumlar sonlandırılamadı',
    );
  }
}
