import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { SupabaseService } from '../common/services/supabase.service';
import { LoggerService } from '../common/logger/logger.service';

@Injectable()
export class CmsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('CmsService');
  }

  private throwError(code: string, message: string, status: HttpStatus): never {
    throw new HttpException({ success: false, code, message }, status);
  }

  // ==================== BLOGS ====================

  async getBlogs(options?: { category?: string; limit?: number; offset?: number }) {
    try {
      let query = this.supabase.getAdminClient()
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
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        this.throwError('BLOGS_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      return { success: true, data, count };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Blog listesi hatası', error: error.message });
      this.throwError('BLOGS_ERROR', 'Bloglar getirilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getBlogBySlug(slug: string) {
    try {
      const { data, error } = await this.supabase.getAdminClient()
        .from('blogs')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (error || !data) {
        this.throwError('BLOG_NOT_FOUND', 'Blog bulunamadı', HttpStatus.NOT_FOUND);
      }

      // View count artır
      await this.supabase.getAdminClient()
        .from('blogs')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', data.id);

      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Blog detay hatası', error: error.message });
      this.throwError('BLOG_ERROR', 'Blog getirilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ==================== CAMPAIGNS ====================

  async getCampaigns(options?: { type?: string; limit?: number }) {
    try {
      let query = this.supabase.getAdminClient()
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

      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Kampanya listesi hatası', error: error.message });
      this.throwError('CAMPAIGNS_ERROR', 'Kampanyalar getirilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getCampaignBySlug(slug: string) {
    try {
      const { data, error } = await this.supabase.getAdminClient()
        .from('campaigns')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        this.throwError('CAMPAIGN_NOT_FOUND', 'Kampanya bulunamadı', HttpStatus.NOT_FOUND);
      }

      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Kampanya detay hatası', error: error.message });
      this.throwError('CAMPAIGN_ERROR', 'Kampanya getirilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ==================== DISCOUNTS ====================

  async getDiscounts() {
    try {
      const { data, error } = await this.supabase.getAdminClient()
        .from('discount')
        .select('id, code, name, description, type, value, min_purchase_amount, applies_to, start_date, end_date')
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        this.throwError('DISCOUNTS_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'İndirim listesi hatası', error: error.message });
      this.throwError('DISCOUNTS_ERROR', 'İndirimler getirilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async validateDiscountCode(code: string) {
    try {
      const { data, error } = await this.supabase.getAdminClient()
        .from('discount')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .single();

      if (error || !data) {
        this.throwError('DISCOUNT_INVALID', 'Geçersiz indirim kodu', HttpStatus.NOT_FOUND);
      }

      // Usage limit kontrolü
      if (data.usage_limit && data.used_count >= data.usage_limit) {
        this.throwError('DISCOUNT_EXPIRED', 'İndirim kodu kullanım limitine ulaştı', HttpStatus.BAD_REQUEST);
      }

      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'İndirim kodu doğrulama hatası', error: error.message });
      this.throwError('DISCOUNT_ERROR', 'İndirim kodu doğrulanamadı', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ==================== TREND HOTELS ====================

  async getTrendHotels(limit = 6) {
    try {
      const { data, error } = await this.supabase.getAdminClient()
        .from('trend_hotel')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(limit);

      if (error) {
        this.throwError('TREND_HOTELS_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Trend otel listesi hatası', error: error.message });
      this.throwError('TREND_HOTELS_ERROR', 'Trend oteller getirilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ==================== TREND FLIGHTS ====================

  async getTrendFlights(limit = 6) {
    try {
      const { data, error } = await this.supabase.getAdminClient()
        .from('trend_flight')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(limit);

      if (error) {
        this.throwError('TREND_FLIGHTS_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Trend uçuş listesi hatası', error: error.message });
      this.throwError('TREND_FLIGHTS_ERROR', 'Trend uçuşlar getirilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ==================== STATIC PAGES ====================

  async getStaticPages() {
    try {
      const { data, error } = await this.supabase.getAdminClient()
        .from('static_pages')
        .select('slug, title, meta_description, updated_at')
        .eq('is_published', true)
        .order('title', { ascending: true });

      if (error) {
        this.throwError('STATIC_PAGES_ERROR', error.message, HttpStatus.BAD_REQUEST);
      }

      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Statik sayfa listesi hatası', error: error.message });
      this.throwError('STATIC_PAGES_ERROR', 'Sayfalar getirilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getStaticPageBySlug(slug: string) {
    try {
      const { data, error } = await this.supabase.getAdminClient()
        .from('static_pages')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (error || !data) {
        this.throwError('PAGE_NOT_FOUND', 'Sayfa bulunamadı', HttpStatus.NOT_FOUND);
      }

      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error({ message: 'Statik sayfa detay hatası', error: error.message });
      this.throwError('PAGE_ERROR', 'Sayfa getirilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

