import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SupabaseService } from '../../common/services/supabase.service';
import { LoggerService } from '../../common/logger/logger.service';
import { BaseAdminService } from '../base/base-admin.service';
import { CmsQueryDto } from '../dto/admin-query.dto';
import { CreateBlogDto, UpdateBlogDto } from '../dto/create-blog.dto';
import { CreateCampaignDto, UpdateCampaignDto } from '../dto/create-campaign.dto';
import { CreateDiscountDto, UpdateDiscountDto } from '../dto/create-discount.dto';
import { CreateTrendFlightDto, UpdateTrendFlightDto } from '../dto/create-trend-flight.dto';
import { CreateStaticPageDto, UpdateStaticPageDto } from '../dto/create-static-page.dto';
import { CreateFaqDto, UpdateFaqDto } from '../dto/create-faq.dto';

@Injectable()
export class CmsAdminService extends BaseAdminService {
  constructor(
    supabase: SupabaseService,
    logger: LoggerService,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
  ) {
    super(supabase, logger, cacheManager);
    this.logger.setContext('CmsAdminService');
  }

  // ==================== CMS - BLOGS ====================

  async getAdminBlogs(query: CmsQueryDto) {
    return this.handleRequest(
      async () => {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const offset = (page - 1) * limit;

        let dbQuery = this.supabase
          .getAdminClient()
          .from('blogs')
          .select('*', { count: 'exact' });

        if (query.category) dbQuery = dbQuery.eq('category', query.category);
        if (query.is_published !== undefined) {
          dbQuery = dbQuery.eq('is_published', query.is_published === 'true');
        }
        if (query.search) {
          dbQuery = dbQuery.or(`title.ilike.%${query.search}%,content.ilike.%${query.search}%`);
        }

        dbQuery = dbQuery.order('created_at', { ascending: false });
        dbQuery = dbQuery.range(offset, offset + limit - 1);

        const { data, error, count } = await dbQuery;

        if (error) this.throwError('BLOGS_FETCH_ERROR', error.message, HttpStatus.BAD_REQUEST);

        return {
          success: true,
          data,
          pagination: this.getPagination(page, limit, count || 0),
        };
      },
      'BLOGS_FETCH_ERROR',
      'Blog listesi getirilemedi',
    );
  }

  async createBlog(dto: CreateBlogDto, adminId: string) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('blogs')
          .insert([dto])
          .select()
          .single();

        if (error) this.throwError('BLOG_CREATE_ERROR', error.message, HttpStatus.BAD_REQUEST);

        await this.clearCmsCache('blogs');
        this.logger.log({ message: 'Admin: Blog oluşturuldu', adminId, blogId: data.id });

        return { success: true, data };
      },
      'BLOG_CREATE_ERROR',
      'Blog oluşturulamadı',
    );
  }

  async updateBlog(id: string, dto: UpdateBlogDto, adminId: string) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('blogs')
          .update({ ...dto, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (error) this.throwError('BLOG_UPDATE_ERROR', error.message, HttpStatus.BAD_REQUEST);

        await this.clearCmsCache('blogs');
        this.logger.log({ message: 'Admin: Blog güncellendi', adminId, blogId: id });

        return { success: true, data };
      },
      'BLOG_UPDATE_ERROR',
      'Blog güncellenemedi',
    );
  }

  async deleteBlog(id: string, adminId: string) {
    return this.handleRequest(
      async () => {
        const { error } = await this.supabase
          .getAdminClient()
          .from('blogs')
          .delete()
          .eq('id', id);

        if (error) this.throwError('BLOG_DELETE_ERROR', error.message, HttpStatus.BAD_REQUEST);

        await this.clearCmsCache('blogs');
        this.logger.log({ message: 'Admin: Blog silindi', adminId, blogId: id });

        return { success: true, message: 'Blog başarıyla silindi' };
      },
      'BLOG_DELETE_ERROR',
      'Blog silinemedi',
    );
  }

  // ==================== CMS - CAMPAIGNS ====================

  async getAdminCampaigns(query: CmsQueryDto) {
    return this.handleRequest(
      async () => {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const offset = (page - 1) * limit;

        let dbQuery = this.supabase
          .getAdminClient()
          .from('campaigns')
          .select('*', { count: 'exact' });

        if (query.search) dbQuery = dbQuery.ilike('title', `%${query.search}%`);

        dbQuery = dbQuery.order('created_at', { ascending: false });
        dbQuery = dbQuery.range(offset, offset + limit - 1);

        const { data, error, count } = await dbQuery;

        if (error) {
          this.throwError('CAMPAIGNS_FETCH_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        return {
          success: true,
          data,
          pagination: this.getPagination(page, limit, count || 0),
        };
      },
      'CAMPAIGNS_FETCH_ERROR',
      'Kampanya listesi getirilemedi',
    );
  }

  async createCampaign(dto: CreateCampaignDto, adminId: string) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('campaigns')
          .insert([dto])
          .select()
          .single();

        if (error) {
          this.throwError('CAMPAIGN_CREATE_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        await this.clearCmsCache('campaigns');
        this.logger.log({ message: 'Admin: Kampanya oluşturuldu', adminId, campaignId: data.id });

        return { success: true, data };
      },
      'CAMPAIGN_CREATE_ERROR',
      'Kampanya oluşturulamadı',
    );
  }

  async updateCampaign(id: string, dto: UpdateCampaignDto, adminId: string) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('campaigns')
          .update({ ...dto, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          this.throwError('CAMPAIGN_UPDATE_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        await this.clearCmsCache('campaigns');
        this.logger.log({ message: 'Admin: Kampanya güncellendi', adminId, campaignId: id });

        return { success: true, data };
      },
      'CAMPAIGN_UPDATE_ERROR',
      'Kampanya güncellenemedi',
    );
  }

  async deleteCampaign(id: string, adminId: string) {
    return this.handleRequest(
      async () => {
        const { error } = await this.supabase
          .getAdminClient()
          .from('campaigns')
          .delete()
          .eq('id', id);

        if (error) {
          this.throwError('CAMPAIGN_DELETE_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        await this.clearCmsCache('campaigns');
        this.logger.log({ message: 'Admin: Kampanya silindi', adminId, campaignId: id });

        return { success: true, message: 'Kampanya başarıyla silindi' };
      },
      'CAMPAIGN_DELETE_ERROR',
      'Kampanya silinemedi',
    );
  }

  // ==================== CMS - DISCOUNTS ====================

  async getAdminDiscounts(query: CmsQueryDto) {
    return this.handleRequest(
      async () => {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const offset = (page - 1) * limit;

        let dbQuery = this.supabase
          .getAdminClient()
          .from('discount')
          .select('*', { count: 'exact' });

        if (query.search) {
          dbQuery = dbQuery.or(`code.ilike.%${query.search}%,name.ilike.%${query.search}%`);
        }

        dbQuery = dbQuery.order('created_at', { ascending: false });
        dbQuery = dbQuery.range(offset, offset + limit - 1);

        const { data, error, count } = await dbQuery;

        if (error) {
          this.throwError('DISCOUNTS_FETCH_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        return {
          success: true,
          data,
          pagination: this.getPagination(page, limit, count || 0),
        };
      },
      'DISCOUNTS_FETCH_ERROR',
      'İndirim kodları getirilemedi',
    );
  }

  async createDiscount(dto: CreateDiscountDto, adminId: string) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('discount')
          .insert([{ ...dto, code: dto.code.toUpperCase() }])
          .select()
          .single();

        if (error) {
          this.throwError('DISCOUNT_CREATE_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        await this.clearCmsCache('discounts');
        this.logger.log({ message: 'Admin: İndirim kodu oluşturuldu', adminId, discountId: data.id });

        return { success: true, data };
      },
      'DISCOUNT_CREATE_ERROR',
      'İndirim kodu oluşturulamadı',
    );
  }

  async updateDiscount(id: string, dto: UpdateDiscountDto, adminId: string) {
    return this.handleRequest(
      async () => {
        const updateData: any = { ...dto, updated_at: new Date().toISOString() };
        if (dto.code) updateData.code = dto.code.toUpperCase();

        const { data, error } = await this.supabase
          .getAdminClient()
          .from('discount')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          this.throwError('DISCOUNT_UPDATE_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        await this.clearCmsCache('discounts');
        this.logger.log({ message: 'Admin: İndirim kodu güncellendi', adminId, discountId: id });

        return { success: true, data };
      },
      'DISCOUNT_UPDATE_ERROR',
      'İndirim kodu güncellenemedi',
    );
  }

  async deleteDiscount(id: string, adminId: string) {
    return this.handleRequest(
      async () => {
        const { error } = await this.supabase
          .getAdminClient()
          .from('discount')
          .delete()
          .eq('id', id);

        if (error) {
          this.throwError('DISCOUNT_DELETE_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        await this.clearCmsCache('discounts');
        this.logger.log({ message: 'Admin: İndirim kodu silindi', adminId, discountId: id });

        return { success: true, message: 'İndirim kodu başarıyla silindi' };
      },
      'DISCOUNT_DELETE_ERROR',
      'İndirim kodu silinemedi',
    );
  }

  // ==================== CMS - TREND FLIGHTS ====================

  async getAdminTrendFlights(query: CmsQueryDto) {
    return this.handleRequest(
      async () => {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const offset = (page - 1) * limit;

        let dbQuery = this.supabase
          .getAdminClient()
          .from('trend_flight')
          .select('*', { count: 'exact' });

        if (query.search) {
          dbQuery = dbQuery.or(`departure.ilike.%${query.search}%,arrival.ilike.%${query.search}%`);
        }

        dbQuery = dbQuery.order('priority', { ascending: false });
        dbQuery = dbQuery.range(offset, offset + limit - 1);

        const { data, error, count } = await dbQuery;

        if (error) {
          this.throwError('TREND_FLIGHTS_FETCH_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        return {
          success: true,
          data,
          pagination: this.getPagination(page, limit, count || 0),
        };
      },
      'TREND_FLIGHTS_FETCH_ERROR',
      'Trend uçuşlar getirilemedi',
    );
  }

  async createTrendFlight(dto: CreateTrendFlightDto, adminId: string) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('trend_flight')
          .insert([dto])
          .select()
          .single();

        if (error) {
          this.throwError('TREND_FLIGHT_CREATE_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        await this.clearCmsCache('trends');
        this.logger.log({ message: 'Admin: Trend uçuş oluşturuldu', adminId, trendId: data.id });

        return { success: true, data };
      },
      'TREND_FLIGHT_CREATE_ERROR',
      'Trend uçuş oluşturulamadı',
    );
  }

  async updateTrendFlight(id: string, dto: UpdateTrendFlightDto, adminId: string) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('trend_flight')
          .update({ ...dto, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          this.throwError('TREND_FLIGHT_UPDATE_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        await this.clearCmsCache('trends');
        this.logger.log({ message: 'Admin: Trend uçuş güncellendi', adminId, trendId: id });

        return { success: true, data };
      },
      'TREND_FLIGHT_UPDATE_ERROR',
      'Trend uçuş güncellenemedi',
    );
  }

  async deleteTrendFlight(id: string, adminId: string) {
    return this.handleRequest(
      async () => {
        const { error } = await this.supabase
          .getAdminClient()
          .from('trend_flight')
          .delete()
          .eq('id', id);

        if (error) {
          this.throwError('TREND_FLIGHT_DELETE_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        await this.clearCmsCache('trends');
        this.logger.log({ message: 'Admin: Trend uçuş silindi', adminId, trendId: id });

        return { success: true, message: 'Trend uçuş başarıyla silindi' };
      },
      'TREND_FLIGHT_DELETE_ERROR',
      'Trend uçuş silinemedi',
    );
  }

  // ==================== CMS - STATIC PAGES ====================

  async getAdminStaticPages(query: CmsQueryDto) {
    return this.handleRequest(
      async () => {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const offset = (page - 1) * limit;

        let dbQuery = this.supabase
          .getAdminClient()
          .from('static_pages')
          .select('*', { count: 'exact' });

        if (query.search) {
          dbQuery = dbQuery.or(`title.ilike.%${query.search}%,slug.ilike.%${query.search}%`);
        }

        dbQuery = dbQuery.order('created_at', { ascending: false });
        dbQuery = dbQuery.range(offset, offset + limit - 1);

        const { data, error, count } = await dbQuery;

        if (error) {
          this.throwError('STATIC_PAGES_FETCH_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        return {
          success: true,
          data,
          pagination: this.getPagination(page, limit, count || 0),
        };
      },
      'STATIC_PAGES_FETCH_ERROR',
      'Statik sayfalar getirilemedi',
    );
  }

  async createStaticPage(dto: CreateStaticPageDto, adminId: string) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('static_pages')
          .insert([dto])
          .select()
          .single();

        if (error) {
          this.throwError('STATIC_PAGE_CREATE_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        await this.clearCmsCache('pages');
        this.logger.log({ message: 'Admin: Statik sayfa oluşturuldu', adminId, pageId: data.id });

        return { success: true, data };
      },
      'STATIC_PAGE_CREATE_ERROR',
      'Statik sayfa oluşturulamadı',
    );
  }

  async updateStaticPage(id: string, dto: UpdateStaticPageDto, adminId: string) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('static_pages')
          .update({ ...dto, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          this.throwError('STATIC_PAGE_UPDATE_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        await this.clearCmsCache('pages');
        this.logger.log({ message: 'Admin: Statik sayfa güncellendi', adminId, pageId: id });

        return { success: true, data };
      },
      'STATIC_PAGE_UPDATE_ERROR',
      'Statik sayfa güncellenemedi',
    );
  }

  async deleteStaticPage(id: string, adminId: string) {
    return this.handleRequest(
      async () => {
        const { error } = await this.supabase
          .getAdminClient()
          .from('static_pages')
          .delete()
          .eq('id', id);

        if (error) {
          this.throwError('STATIC_PAGE_DELETE_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        await this.clearCmsCache('pages');
        this.logger.log({ message: 'Admin: Statik sayfa silindi', adminId, pageId: id });

        return { success: true, message: 'Statik sayfa başarıyla silindi' };
      },
      'STATIC_PAGE_DELETE_ERROR',
      'Statik sayfa silinemedi',
    );
  }

  // ==================== CMS - FAQ ====================

  async getAdminFaqs(query: CmsQueryDto) {
    return this.handleRequest(
      async () => {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const offset = (page - 1) * limit;

        let dbQuery = this.supabase
          .getAdminClient()
          .from('faq')
          .select('*', { count: 'exact' });

        if (query.search) {
          dbQuery = dbQuery.or(
            `question_tr.ilike.%${query.search}%,question_en.ilike.%${query.search}%`,
          );
        }

        dbQuery = dbQuery.order('priority', { ascending: true });
        dbQuery = dbQuery.range(offset, offset + limit - 1);

        const { data, error, count } = await dbQuery;

        if (error) this.throwError('FAQ_FETCH_ERROR', error.message, HttpStatus.BAD_REQUEST);

        return {
          success: true,
          data,
          pagination: this.getPagination(page, limit, count || 0),
        };
      },
      'FAQ_FETCH_ERROR',
      'FAQ listesi getirilemedi',
    );
  }

  async createFaq(dto: CreateFaqDto, adminId: string) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('faq')
          .insert([dto])
          .select()
          .single();

        if (error) this.throwError('FAQ_CREATE_ERROR', error.message, HttpStatus.BAD_REQUEST);

        await this.clearCmsCache('faq');
        this.logger.log({ message: 'Admin: FAQ oluşturuldu', adminId, faqId: data.id });

        return { success: true, data };
      },
      'FAQ_CREATE_ERROR',
      'FAQ oluşturulamadı',
    );
  }

  async updateFaq(id: string, dto: UpdateFaqDto, adminId: string) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('faq')
          .update({ ...dto, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (error) this.throwError('FAQ_UPDATE_ERROR', error.message, HttpStatus.BAD_REQUEST);

        await this.clearCmsCache('faq');
        this.logger.log({ message: 'Admin: FAQ güncellendi', adminId, faqId: id });

        return { success: true, data };
      },
      'FAQ_UPDATE_ERROR',
      'FAQ güncellenemedi',
    );
  }

  async deleteFaq(id: string, adminId: string) {
    return this.handleRequest(
      async () => {
        const { error } = await this.supabase.getAdminClient().from('faq').delete().eq('id', id);

        if (error) this.throwError('FAQ_DELETE_ERROR', error.message, HttpStatus.BAD_REQUEST);

        await this.clearCmsCache('faq');
        this.logger.log({ message: 'Admin: FAQ silindi', adminId, faqId: id });

        return { success: true, message: 'FAQ başarıyla silindi' };
      },
      'FAQ_DELETE_ERROR',
      'FAQ silinemedi',
    );
  }
}

