import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SupabaseService } from '../../common/services/supabase.service';
import { LoggerService } from '../../common/logger/logger.service';
import { BaseAdminService } from '../base/base-admin.service';
import { UserQueryDto } from '../dto/admin-query.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UsersService extends BaseAdminService {
  constructor(
    supabase: SupabaseService,
    logger: LoggerService,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
  ) {
    super(supabase, logger, cacheManager);
    this.logger.setContext('UsersService');
  }

  async getUsers(query: UserQueryDto) {
    return this.handleRequest(
      async () => {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const offset = (page - 1) * limit;

        let dbQuery = this.supabase
          .getAdminClient()
          .from('user_profiles')
          .select('*', { count: 'exact' });

        if (query.search) {
          dbQuery = dbQuery.or(
            `email.ilike.%${query.search}%,full_name.ilike.%${query.search}%,phone.ilike.%${query.search}%`,
          );
        }

        const sortField = query.sort || 'created_at';
        const sortOrder = query.order || 'desc';
        dbQuery = dbQuery.order(sortField, { ascending: sortOrder === 'asc' });
        dbQuery = dbQuery.range(offset, offset + limit - 1);

        const { data, error, count } = await dbQuery;

        if (error) this.throwError('USERS_FETCH_ERROR', error.message, HttpStatus.BAD_REQUEST);

        // Her kullanıcı için admin_roles tablosundan rol bilgisini al
        const usersWithAdminInfo = await Promise.all(
          (data || []).map(async (user) => {
            try {
              const roleInfo = await this.getUserRole(user.id);
              return {
                ...user,
                is_admin: roleInfo.success && (roleInfo.data?.role === 'admin' || roleInfo.data?.role === 'super_admin'),
                is_super_admin: roleInfo.success && roleInfo.data?.role === 'super_admin',
                role: roleInfo.success ? roleInfo.data?.role || 'authenticated' : 'authenticated',
                permissions: roleInfo.success ? roleInfo.data?.permissions || {} : {},
              };
            } catch (err) {
              this.logger.warn({ message: 'Rol bilgisi alınamadı', userId: user.id, error: err });
              return {
                ...user,
                is_admin: false,
                is_super_admin: false,
                role: 'authenticated',
                permissions: {},
              };
            }
          }),
        );

        return {
          success: true,
          data: usersWithAdminInfo,
          pagination: this.getPagination(page, limit, count || 0),
        };
      },
      'USERS_FETCH_ERROR',
      'Kullanıcılar getirilemedi',
    );
  }

  async getUser(id: string) {
    return this.handleRequest(
      async () => {
        const { data: user, error } = await this.supabase
          .getAdminClient()
          .from('user_profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !user) {
          this.throwError('USER_NOT_FOUND', 'Kullanıcı bulunamadı', HttpStatus.NOT_FOUND);
        }

        // İstatistikleri al
        const [bookingsResult, transactionsResult] = await Promise.all([
          this.supabase
            .getAdminClient()
            .schema('backend')
            .from('booking')
            .select('id', { count: 'exact' })
            .eq('user_id', id),
          this.supabase
            .getAdminClient()
            .from('user_transaction')
            .select('amount', { count: 'exact' })
            .eq('user_id', id)
            .eq('status', 'success'),
        ]);

        const totalSpent =
          transactionsResult.data?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

        return {
          success: true,
          data: {
            ...user,
            stats: {
              total_bookings: bookingsResult.count || 0,
              total_transactions: transactionsResult.count || 0,
              total_spent: totalSpent,
            },
          },
        };
      },
      'USER_FETCH_ERROR',
      'Kullanıcı getirilemedi',
    );
  }

  async updateUser(id: string, dto: UpdateUserDto, adminId: string) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('user_profiles')
          .update({ ...dto, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (error) this.throwError('USER_UPDATE_ERROR', error.message, HttpStatus.BAD_REQUEST);

        this.logger.log({
          message: 'Admin: Kullanıcı güncellendi',
          adminId,
          targetUserId: id,
          changes: dto,
        });

        return { success: true, data };
      },
      'USER_UPDATE_ERROR',
      'Kullanıcı güncellenemedi',
    );
  }

  async deleteUser(id: string, adminId: string) {
    return this.handleRequest(
      async () => {
        // Supabase Auth'dan kullanıcıyı sil
        const { error: authError } = await this.supabase
          .getAdminClient()
          .auth.admin.deleteUser(id);

        if (authError) {
          this.throwError('USER_DELETE_ERROR', authError.message, HttpStatus.BAD_REQUEST);
        }

        this.logger.log({
          message: 'Admin: Kullanıcı silindi',
          adminId,
          targetUserId: id,
        });

        return { success: true, message: 'Kullanıcı başarıyla silindi' };
      },
      'USER_DELETE_ERROR',
      'Kullanıcı silinemedi',
    );
  }

  // ==================== ROLE MANAGEMENT ====================

  async getUserRole(userId: string) {
    return this.handleRequest(
      async () => {
        const cacheKey = `admin:role:${userId}`;
        const cached = await this.cacheManager.get<{ role: string; permissions: Record<string, boolean> }>(cacheKey);
        if (cached) {
          return { success: true, data: cached };
        }

        const { data, error } = await this.supabase
          .getAdminClient()
          .from('admin_roles')
          .select('role, permissions')
          .eq('user_id', userId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // Not found
            return { success: false, code: 'ROLE_NOT_FOUND', message: 'Kullanıcı için rol bulunamadı' };
          }
          this.throwError('ROLE_FETCH_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        const roleData = {
          role: data.role,
          permissions: (data.permissions as Record<string, boolean>) || {},
        };

        // Cache'e kaydet (5 dakika)
        await this.cacheManager.set(cacheKey, roleData, 5 * 60 * 1000);

        return { success: true, data: roleData };
      },
      'ROLE_FETCH_ERROR',
      'Rol bilgisi alınamadı',
    );
  }


  async updateUserRole(userId: string, role: 'super_admin' | 'admin' | 'moderator', updatedBy: string) {
    return this.handleRequest(
      async () => {
        // Önce güncelleyen kişinin super_admin olduğunu kontrol et
        const updaterRole = await this.getUserRole(updatedBy);
        if (!updaterRole.success || updaterRole.data?.role !== 'super_admin') {
          this.throwError('INSUFFICIENT_PERMISSION', 'Sadece super_admin rol güncelleyebilir', HttpStatus.FORBIDDEN);
        }

        const { data, error } = await this.supabase
          .getAdminClient()
          .from('admin_roles')
          .upsert(
            {
              user_id: userId,
              role,
              permissions: role === 'moderator' ? {} : null, // moderator değilse permissions'ı temizle
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'user_id',
            },
          )
          .select('id, role, permissions, updated_at')
          .single();

        if (error) {
          this.throwError('ROLE_UPDATE_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        // Cache'i invalidate et
        await this.cacheManager.del(`admin:role:${userId}`);

        this.logger.log({ message: 'Admin: Rol güncellendi', adminId: updatedBy, userId, role });

        return { success: true, data };
      },
      'ROLE_UPDATE_ERROR',
      'Rol güncellenemedi',
    );
  }

  async updateModeratorPermissions(
    userId: string,
    permissions: Record<string, boolean>,
    updatedBy: string,
  ) {
    return this.handleRequest(
      async () => {
        // Önce güncelleyen kişinin super_admin olduğunu kontrol et
        const updaterRole = await this.getUserRole(updatedBy);
        if (!updaterRole.success || updaterRole.data?.role !== 'super_admin') {
          this.throwError('INSUFFICIENT_PERMISSION', 'Sadece super_admin izin güncelleyebilir', HttpStatus.FORBIDDEN);
        }

        // Kullanıcının moderator olduğunu kontrol et
        const userRole = await this.getUserRole(userId);
        if (!userRole.success || userRole.data?.role !== 'moderator') {
          this.throwError('INVALID_ROLE', 'Sadece moderator rolü için izin güncellenebilir', HttpStatus.BAD_REQUEST);
        }

        const { data, error } = await this.supabase
          .getAdminClient()
          .from('admin_roles')
          .update({
            permissions,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .select('id, role, permissions, updated_at')
          .single();

        if (error) {
          this.throwError('PERMISSION_UPDATE_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        // Cache'i invalidate et
        await this.cacheManager.del(`admin:role:${userId}`);

        this.logger.log({ message: 'Admin: Moderator izinleri güncellendi', adminId: updatedBy, userId, permissions });

        return { success: true, data };
      },
      'PERMISSION_UPDATE_ERROR',
      'İzinler güncellenemedi',
    );
  }

  async getAllRoles() {
    return {
      success: true,
      data: {
        roles: [
          {
            role: 'super_admin',
            name: 'Süper Admin',
            description: 'Tüm yetkilere sahip, diğer admin\'leri yönetebilir',
            permissions: ['*'], // Tüm yetkiler
          },
          {
            role: 'admin',
            name: 'Admin',
            description: 'Kullanıcı, rezervasyon, işlem ve CMS yönetimi',
            permissions: [
              'users.read',
              'users.write',
              'users.delete',
              'bookings.read',
              'bookings.update',
              'transactions.read',
              'transactions.refund',
              'cms.read',
              'cms.write',
              'dashboard.read',
            ],
          },
          {
            role: 'moderator',
            name: 'Moderatör',
            description: 'Sadece okuma yetkisi, super_admin tarafından özel izinler verilebilir',
            permissions: [
              'users.read',
              'bookings.read',
              'transactions.read',
              'cms.read',
              'dashboard.read',
            ],
            customPermissions: [
              'users.write',
              'bookings.update',
              'transactions.refund',
              'cms.write',
            ],
          },
        ],
      },
    };
  }

  async getAvailablePermissions() {
    return {
      success: true,
      data: {
        permissions: [
          {
            key: 'users.write',
            name: 'Kullanıcı Düzenleme',
            description: 'Kullanıcı bilgilerini güncelleme yetkisi',
          },
          {
            key: 'bookings.update',
            name: 'Rezervasyon Güncelleme',
            description: 'Rezervasyon durumunu güncelleme yetkisi',
          },
          {
            key: 'transactions.refund',
            name: 'İade İşlemi',
            description: 'İşlem iadesi yapma yetkisi',
          },
          {
            key: 'cms.write',
            name: 'CMS Düzenleme',
            description: 'Blog, kampanya, indirim gibi CMS içeriklerini düzenleme yetkisi',
          },
        ],
      },
    };
  }
}

