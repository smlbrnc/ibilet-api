import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../services/supabase.service';
import { LoggerService } from '../logger/logger.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly reflector: Reflector,
    private readonly logger: LoggerService,
    private readonly config: ConfigService,
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

    // Admin yetkisi kontrolü
    const isAdmin = await this.checkAdminStatus(user);
    if (!isAdmin) {
      this.logger.warn({
        message: 'Admin yetkisi reddedildi',
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

    this.logger.debug({
      message: 'Admin erişimi onaylandı',
      userId: user.id,
      endpoint: context.getHandler().name,
    });

    return true;
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
}
