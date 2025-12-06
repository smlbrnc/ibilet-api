import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SupabaseService } from '../common/services/supabase.service';
import { LoggerService } from '../common/logger/logger.service';

@Injectable()
export class CmsService {
  // Cache TTL süreleri (ms)
  private readonly CACHE_TTL = {
    BLOGS: 30 * 60 * 1000, // 30 dakika
    BLOG_DETAIL: 60 * 60 * 1000, // 1 saat
    CATEGORIES: 60 * 60 * 1000, // 1 saat
    CAMPAIGNS: 15 * 60 * 1000, // 15 dakika
    DISCOUNTS: 10 * 60 * 1000, // 10 dakika
    TRENDS: 30 * 60 * 1000, // 30 dakika
    PAGES: 60 * 60 * 1000, // 1 saat
    FAQ: 60 * 60 * 1000, // 1 saat
  };

  constructor(
    private readonly supabase: SupabaseService,
    private readonly logger: LoggerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.logger.setContext('CmsService');
  }

  // ==================== HELPER METHODS ====================

  private throwError(code: string, message: string, status: HttpStatus): never {
    throw new HttpException({ success: false, code, message }, status);
  }

  private async getCachedOrExecute<T>(
    cacheKey: string,
    ttl: number,
    executeFn: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.cacheManager.get<T>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await executeFn();
    await this.cacheManager.set(cacheKey, result, ttl);
    return result;
  }

  private handleError(error: unknown, errorMessage: string, defaultCode: string): never {
    if (error instanceof HttpException) {
      throw error;
    }
    this.logger.error({ message: errorMessage, error: (error as Error).message });
    this.throwError(defaultCode, errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  private createSuccessResponse<T>(data: T, count?: number | null) {
    return count !== undefined && count !== null
      ? { success: true, data, count }
      : { success: true, data };
  }

  // ==================== BLOGS ====================

  async getBlogs(options?: { category?: string; limit?: number; offset?: number }) {
    try {
      const cacheKey = `cms:blogs:${JSON.stringify(options || {})}`;

      return await this.getCachedOrExecute(
        cacheKey,
        this.CACHE_TTL.BLOGS,
        async () => {
          let query = this.supabase
            .getAdminClient()
            .from('blogs')
            .select('*')
            .eq('is_published', true)
            .order('published_at', { ascending: false });

          if (options?.category) {
            query = query.eq('category', options.category);
          }
          if (options?.limit) {
            query = query.limit(options.limit);
          }
          if (options?.offset !== undefined) {
            query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
          }

          const { data, error, count } = await query;

          if (error) {
            this.throwError('BLOGS_ERROR', error.message, HttpStatus.BAD_REQUEST);
          }

          return this.createSuccessResponse(data, count);
        },
      );
    } catch (error) {
      this.handleError(error, 'Blog listesi hatası', 'BLOGS_ERROR');
    }
  }

  async getBlogBySlug(slug: string) {
    try {
      const cacheKey = `cms:blog:${slug}`;

      return await this.getCachedOrExecute(
        cacheKey,
        this.CACHE_TTL.BLOG_DETAIL,
        async () => {
          const { data, error } = await this.supabase
            .getAdminClient()
            .from('blogs')
            .select('*')
            .eq('slug', slug)
            .eq('is_published', true)
            .single();

          if (error || !data) {
            this.throwError('BLOG_NOT_FOUND', 'Blog bulunamadı', HttpStatus.NOT_FOUND);
          }

          // View count artır
          await this.supabase
            .getAdminClient()
            .from('blogs')
            .update({ view_count: (data.view_count || 0) + 1 })
            .eq('id', data.id);

          return this.createSuccessResponse(data);
        },
      );
    } catch (error) {
      this.handleError(error, 'Blog detay hatası', 'BLOG_ERROR');
    }
  }

  async getBlogCategories() {
    try {
      const cacheKey = 'cms:blog:categories';

      return await this.getCachedOrExecute(cacheKey, this.CACHE_TTL.CATEGORIES, async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('blog_categories')
          .select('*')
          .order('id', { ascending: true });

        if (error) {
          this.throwError('BLOG_CATEGORIES_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        return this.createSuccessResponse(data);
      });
    } catch (error) {
      this.handleError(error, 'Blog kategorileri hatası', 'BLOG_CATEGORIES_ERROR');
    }
  }

  async getBlogsByCategoryId(categoryId: string, options?: { limit?: number; offset?: number }) {
    try {
      const cacheKey = `cms:blogs:category:${categoryId}:${JSON.stringify(options || {})}`;

      return await this.getCachedOrExecute(
        cacheKey,
        this.CACHE_TTL.BLOGS,
        async () => {
          const { data: mappings, error: mappingError } = await this.supabase
            .getAdminClient()
            .from('blog_category_mapping')
            .select('blog_category_name')
            .eq('category_id', categoryId);

          if (mappingError) {
            this.throwError(
              'BLOG_CATEGORY_MAPPING_ERROR',
              mappingError.message,
              HttpStatus.BAD_REQUEST,
            );
          }

          if (!mappings || mappings.length === 0) {
            return this.createSuccessResponse([], 0);
          }

          const categoryNames = mappings.map((m) => m.blog_category_name);

          let query = this.supabase
            .getAdminClient()
            .from('blogs')
            .select('*')
            .eq('is_published', true)
            .in('category', categoryNames)
            .order('published_at', { ascending: false });

          if (options?.limit) {
            query = query.limit(options.limit);
          }
          if (options?.offset !== undefined) {
            query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
          }

          const { data, error, count } = await query;

          if (error) {
            this.throwError('BLOGS_ERROR', error.message, HttpStatus.BAD_REQUEST);
          }

          return this.createSuccessResponse(data, count);
        },
      );
    } catch (error) {
      this.handleError(error, 'Kategoriye göre blog listesi hatası', 'BLOGS_ERROR');
    }
  }

  async getFeaturedBlogs(limit: number = 2) {
    try {
      const cacheKey = `cms:blogs:featured:${limit}`;

      return await this.getCachedOrExecute(cacheKey, this.CACHE_TTL.BLOGS, async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('blogs')
          .select('*')
          .eq('is_published', true)
          .eq('is_featured', true)
          .order('published_at', { ascending: false })
          .limit(limit);

        if (error) {
          this.throwError('BLOGS_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        return this.createSuccessResponse(data);
      });
    } catch (error) {
      this.handleError(error, 'Öne çıkan bloglar hatası', 'BLOGS_ERROR');
    }
  }

  async getRecentBlogs(limit: number = 4) {
    try {
      const cacheKey = `cms:blogs:recent:${limit}`;

      return await this.getCachedOrExecute(cacheKey, this.CACHE_TTL.BLOGS, async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('blogs')
          .select('*')
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .limit(limit);

        if (error) {
          this.throwError('BLOGS_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        return this.createSuccessResponse(data);
      });
    } catch (error) {
      this.handleError(error, 'Son yazılar hatası', 'BLOGS_ERROR');
    }
  }

  // ==================== CAMPAIGNS ====================

  async getCampaigns(options?: { type?: string; limit?: number }) {
    try {
      const cacheKey = `cms:campaigns:${JSON.stringify(options || {})}`;

      return await this.getCachedOrExecute(
        cacheKey,
        this.CACHE_TTL.CAMPAIGNS,
        async () => {
          let query = this.supabase
            .getAdminClient()
            .from('campaigns')
            .select('*')
            .eq('is_active', true)
            .gte('end_date', new Date().toISOString())
            .order('priority', { ascending: false });

          if (options?.type) {
            query = query.eq('type', options.type);
          }
          if (options?.limit) {
            query = query.limit(options.limit);
          }

          const { data, error } = await query;

          if (error) {
            this.throwError('CAMPAIGNS_ERROR', error.message, HttpStatus.BAD_REQUEST);
          }

          return this.createSuccessResponse(data);
        },
      );
    } catch (error) {
      this.handleError(error, 'Kampanya listesi hatası', 'CAMPAIGNS_ERROR');
    }
  }

  async getCampaignBySlug(slug: string) {
    try {
      const cacheKey = `cms:campaign:${slug}`;

      return await this.getCachedOrExecute(cacheKey, this.CACHE_TTL.CAMPAIGNS, async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('campaigns')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .single();

        if (error || !data) {
          this.throwError('CAMPAIGN_NOT_FOUND', 'Kampanya bulunamadı', HttpStatus.NOT_FOUND);
        }

        return this.createSuccessResponse(data);
      });
    } catch (error) {
      this.handleError(error, 'Kampanya detay hatası', 'CAMPAIGN_ERROR');
    }
  }

  // ==================== DISCOUNTS ====================

  async getDiscounts() {
    try {
      const cacheKey = 'cms:discounts';

      return await this.getCachedOrExecute(cacheKey, this.CACHE_TTL.DISCOUNTS, async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('discount')
          .select(
            'id, code, name, description, type, value, min_purchase_amount, applies_to, start_date, end_date',
          )
          .eq('is_active', true)
          .gte('end_date', new Date().toISOString())
          .order('created_at', { ascending: false });

        if (error) {
          this.throwError('DISCOUNTS_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        return this.createSuccessResponse(data);
      });
    } catch (error) {
      this.handleError(error, 'İndirim listesi hatası', 'DISCOUNTS_ERROR');
    }
  }

  async validateDiscountCode(code: string) {
    try {
      const { data, error } = await this.supabase
        .getAdminClient()
        .from('discount')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .single();

      if (error || !data) {
        this.throwError('DISCOUNT_INVALID', 'Geçersiz indirim kodu', HttpStatus.NOT_FOUND);
      }

      if (data.usage_limit && data.used_count >= data.usage_limit) {
        this.throwError(
          'DISCOUNT_EXPIRED',
          'İndirim kodu kullanım limitine ulaştı',
          HttpStatus.BAD_REQUEST,
        );
      }

      return this.createSuccessResponse(data);
    } catch (error) {
      this.handleError(error, 'İndirim kodu doğrulama hatası', 'DISCOUNT_ERROR');
    }
  }

  // ==================== TREND FLIGHTS ====================

  async getTrendFlights(limit = 6) {
    try {
      const cacheKey = `cms:trends:flights:${limit}`;

      return await this.getCachedOrExecute(cacheKey, this.CACHE_TTL.TRENDS, async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('trend_flight')
          .select('*')
          .eq('is_active', true)
          .order('priority', { ascending: false })
          .limit(limit);

        if (error) {
          this.throwError('TREND_FLIGHTS_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        return this.createSuccessResponse(data);
      });
    } catch (error) {
      this.handleError(error, 'Trend uçuş listesi hatası', 'TREND_FLIGHTS_ERROR');
    }
  }

  // ==================== STATIC PAGES ====================

  async getStaticPages() {
    try {
      const cacheKey = 'cms:static:pages';

      return await this.getCachedOrExecute(cacheKey, this.CACHE_TTL.PAGES, async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('static_pages')
          .select('slug, title, meta_description, updated_at')
          .eq('is_published', true)
          .order('title', { ascending: true });

        if (error) {
          this.throwError('STATIC_PAGES_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        return this.createSuccessResponse(data);
      });
    } catch (error) {
      this.handleError(error, 'Statik sayfa listesi hatası', 'STATIC_PAGES_ERROR');
    }
  }

  async getStaticPageBySlug(slug: string) {
    try {
      const cacheKey = `cms:static:page:${slug}`;

      return await this.getCachedOrExecute(cacheKey, this.CACHE_TTL.PAGES, async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('static_pages')
          .select('*')
          .eq('slug', slug)
          .eq('is_published', true)
          .single();

        if (error || !data) {
          this.throwError('PAGE_NOT_FOUND', 'Sayfa bulunamadı', HttpStatus.NOT_FOUND);
        }

        return this.createSuccessResponse(data);
      });
    } catch (error) {
      this.handleError(error, 'Statik sayfa detay hatası', 'PAGE_ERROR');
    }
  }

  // ==================== FAQ ====================

  async getFaqs(language: string = 'tr') {
    try {
      const cacheKey = `cms:faq:${language}`;

      return await this.getCachedOrExecute(cacheKey, this.CACHE_TTL.FAQ, async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('faq')
          .select('*')
          .eq('is_active', true)
          .order('priority', { ascending: true });

        if (error) {
          this.throwError('FAQ_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        const formattedData = data.map((item) => ({
          id: item.id,
          question: language === 'en' ? item.question_en : item.question_tr,
          answer: language === 'en' ? item.answer_en : item.answer_tr,
          priority: item.priority,
        }));

        return this.createSuccessResponse(formattedData);
      });
    } catch (error) {
      this.handleError(error, 'FAQ listesi hatası', 'FAQ_ERROR');
    }
  }
}
