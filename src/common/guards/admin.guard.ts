import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SupabaseService } from '../services/supabase.service';
import { LoggerService } from '../logger/logger.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { REQUIRE_ROLE_KEY, AdminRole } from '../decorators/require-role.decorator';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';

interface AdminRoleData {
  role: AdminRole;
  permissions: Record<string, boolean>;
}

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 dakika

  constructor(
    private readonly supabase: SupabaseService,
    private readonly reflector: Reflector,
    private readonly logger: LoggerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.logger.setContext('AdminGuard');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Public endpoint kontrolü
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // User kontrolü (AuthGuard'dan gelmeli)
    if (!user) {
      throw new ForbiddenException({
        success: false,
        code: 'AUTH_REQUIRED',
        message: 'Bu işlem için giriş yapmanız gereklidir',
      });
    }

    // Role kontrolü - admin_roles tablosundan
    const roleData = await this.getUserRole(user.id);
    if (!roleData) {
      this.logger.warn({
        message: 'Admin yetkisi reddedildi - role bulunamadı',
        userId: user.id,
        email: user.email,
        endpoint: context.getHandler().name,
        ip: request.ip,
      });
      throw new ForbiddenException({
        success: false,
        code: 'ADMIN_REQUIRED',
        message: 'Bu işlem için admin yetkisi gereklidir',
      });
    }

    // @RequireRole decorator kontrolü
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(REQUIRE_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(roleData.role)) {
        this.logger.warn({
          message: 'Role yetkisi reddedildi',
          userId: user.id,
          userRole: roleData.role,
          requiredRoles,
          endpoint: context.getHandler().name,
        });
        throw new ForbiddenException({
          success: false,
          code: 'INSUFFICIENT_ROLE',
          message: 'Bu işlem için yeterli yetkiye sahip değilsiniz',
        });
      }
    }

    // @RequirePermission decorator kontrolü (sadece moderator için)
    const requiredPermission = this.reflector.getAllAndOverride<string>(REQUIRE_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredPermission) {
      const hasPermission = this.checkPermission(roleData, requiredPermission);
      if (!hasPermission) {
        this.logger.warn({
          message: 'Permission yetkisi reddedildi',
          userId: user.id,
          userRole: roleData.role,
          requiredPermission,
          endpoint: context.getHandler().name,
        });
        throw new ForbiddenException({
          success: false,
          code: 'INSUFFICIENT_PERMISSION',
          message: 'Bu işlem için gerekli izne sahip değilsiniz',
        });
      }
    }

    this.logger.debug({
      message: 'Admin erişimi onaylandı',
      userId: user.id,
      role: roleData.role,
      endpoint: context.getHandler().name,
    });

    return true;
  }

  /**
   * Kullanıcının rolünü cache'den veya veritabanından getirir
   */
  private async getUserRole(userId: string): Promise<AdminRoleData | null> {
    const cacheKey = `admin:role:${userId}`;

    // Cache'den kontrol et
    const cached = await this.cacheManager.get<AdminRoleData>(cacheKey);
    if (cached) {
      return cached;
    }

    // Veritabanından sorgula
    const { data, error } = await this.supabase
      .getAdminClient()
      .from('admin_roles')
      .select('role, permissions')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    const roleData: AdminRoleData = {
      role: data.role as AdminRole,
      permissions: (data.permissions as Record<string, boolean>) || {},
    };

    // Cache'e kaydet
    await this.cacheManager.set(cacheKey, roleData, this.CACHE_TTL);

    return roleData;
  }

  /**
   * Permission kontrolü yapar
   * - super_admin ve admin için her zaman true
   * - moderator için permissions JSONB'den kontrol edilir
   */
  private checkPermission(roleData: AdminRoleData, permission: string): boolean {
    // super_admin ve admin için her zaman izin ver
    if (roleData.role === 'super_admin' || roleData.role === 'admin') {
      return true;
    }

    // moderator için permissions kontrolü
    if (roleData.role === 'moderator') {
      return roleData.permissions[permission] === true;
    }

    return false;
  }

  /**
   * Cache'i invalidate et (role değişikliğinde kullanılır)
   */
  async invalidateRoleCache(userId: string): Promise<void> {
    const cacheKey = `admin:role:${userId}`;
    await this.cacheManager.del(cacheKey);
  }
}
