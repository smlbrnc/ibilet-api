import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../services/supabase.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly reflector: Reflector,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('AuthGuard');
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
    const token = this.extractToken(request);

    if (!token) {
      this.logger.warn({
        message: 'Token bulunamadı',
        endpoint: context.getHandler().name,
        ip: request.ip,
      });
      throw new UnauthorizedException({
        success: false,
        code: 'TOKEN_MISSING',
        message: 'Token bulunamadı',
      });
    }

    try {
      // Token'ı Supabase'de validate et
      const {
        data: { user },
        error,
      } = await this.supabase.getAnonClient().auth.getUser(token);

      if (error || !user) {
        this.logger.warn({
          message: 'Geçersiz token',
          endpoint: context.getHandler().name,
          error: error?.message,
          ip: request.ip,
        });
        throw new UnauthorizedException({
          success: false,
          code: 'TOKEN_INVALID',
          message: 'Geçersiz veya süresi dolmuş token',
        });
      }

      // User'ı request'e ekle (CurrentUser decorator için)
      request.user = user;
      // Token'ı da request'e ekle (bazı servislerde gerekebilir)
      request.token = token;

      // Audit log
      this.logger.debug({
        message: 'Authenticated request',
        userId: user.id,
        endpoint: context.getHandler().name,
        ip: request.ip,
      });

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error({
        message: 'Token validation error',
        endpoint: context.getHandler().name,
        error: error instanceof Error ? error.message : String(error),
        ip: request.ip,
      });

      throw new UnauthorizedException({
        success: false,
        code: 'TOKEN_VALIDATION_ERROR',
        message: 'Token doğrulanamadı',
      });
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers?.authorization;
    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }
}
