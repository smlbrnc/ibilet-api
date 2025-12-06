import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { SupabaseService } from '../services/supabase.service';
import { LoggerService } from '../logger/logger.service';

/**
 * Optional Authentication Guard
 * 
 * Token varsa user bilgisini alır ve request.user'a ekler.
 * Token yoksa veya geçersizse sessizce geçer (hata fırlatmaz).
 * 
 * Kullanım:
 * @UseGuards(OptionalAuthGuard)
 * async endpoint(@OptionalCurrentUser() user?: any) {
 *   if (user) {
 *     // Kullanıcı login olmuş
 *   } else {
 *     // Anonymous kullanıcı
 *   }
 * }
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('OptionalAuthGuard');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    // Token yoksa sessizce geç
    if (!token) {
      return true;
    }

    try {
      // Token'ı Supabase'de validate et
      const { data: { user }, error } = await this.supabase
        .getAnonClient()
        .auth.getUser(token);

      if (error || !user) {
        // Token geçersizse sessizce geç (hata fırlatma)
        this.logger.debug({
          message: 'Invalid token in optional auth, continuing as anonymous',
          endpoint: context.getHandler().name,
          error: error?.message,
          ip: request.ip,
        });
        return true;
      }

      // User'ı request'e ekle (OptionalCurrentUser decorator için)
      request.user = user;
      // Token'ı da request'e ekle (bazı servislerde gerekebilir)
      request.token = token;

      // Audit log
      this.logger.debug({
        message: 'Optional authenticated request',
        userId: user.id,
        endpoint: context.getHandler().name,
        ip: request.ip,
      });

      return true;
    } catch (error) {
      // Herhangi bir hata durumunda sessizce geç
      this.logger.debug({
        message: 'Token validation error in optional auth, continuing as anonymous',
        endpoint: context.getHandler().name,
        error: error instanceof Error ? error.message : String(error),
        ip: request.ip,
      });

      return true;
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

