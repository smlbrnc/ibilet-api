import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SupabaseService } from '../../common/services/supabase.service';
import { LoggerService } from '../../common/logger/logger.service';

/**
 * Base Admin Service - Tüm admin modülleri için ortak metodlar
 */
@Injectable()
export abstract class BaseAdminService {
  constructor(
    protected readonly supabase: SupabaseService,
    protected readonly logger: LoggerService,
    @Inject(CACHE_MANAGER) protected readonly cacheManager: Cache,
  ) {}

  protected throwError(code: string, message: string, status: HttpStatus): never {
    throw new HttpException({ success: false, code, message }, status);
  }

  protected async handleRequest<T>(
    operation: () => Promise<T>,
    errorCode: string,
    errorMessage: string,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: errorMessage, error: (error as Error).message });
      this.throwError(errorCode, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  protected getPagination(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  protected async clearCmsCache(type: string) {
    try {
      // CMS service'in kullandığı cache key prefix'lerini temizle
      const prefixes = {
        blogs: ['cms:blogs:', 'cms:blog:'],
        campaigns: ['cms:campaigns:', 'cms:campaign:'],
        discounts: ['cms:discounts'],
        trends: ['cms:trends:'],
        pages: ['cms:static:'],
        faq: ['cms:faq:'],
      };

      const keys = prefixes[type as keyof typeof prefixes] || [];
      for (const key of keys) {
        await this.cacheManager.del(key);
      }
    } catch {
      // Cache temizleme hatalarını sessizce yoksay
    }
  }
}

