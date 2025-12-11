import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SupabaseService } from '../common/services/supabase.service';
import { LoggerService } from '../common/logger/logger.service';
import {
  UserQueryDto,
  BookingQueryDto,
  TransactionQueryDto,
  CmsQueryDto,
  DashboardStatsQueryDto,
} from './dto/admin-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { RefundTransactionDto } from './dto/refund-transaction.dto';
import { CreateBlogDto, UpdateBlogDto } from './dto/create-blog.dto';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/create-campaign.dto';
import { CreateDiscountDto, UpdateDiscountDto } from './dto/create-discount.dto';
import { CreateTrendFlightDto, UpdateTrendFlightDto } from './dto/create-trend-flight.dto';
import { CreateStaticPageDto, UpdateStaticPageDto } from './dto/create-static-page.dto';
import { CreateFaqDto, UpdateFaqDto } from './dto/create-faq.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly logger: LoggerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.logger.setContext('AdminService');
  }

  private throwError(code: string, message: string, status: HttpStatus): never {
    throw new HttpException({ success: false, code, message }, status);
  }

  private async handleRequest<T>(
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

  private getPagination(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==================== USERS ====================

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

        return {
          success: true,
          data,
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

  // ==================== BOOKINGS ====================

  async getBookings(query: BookingQueryDto) {
    return this.handleRequest(
      async () => {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const offset = (page - 1) * limit;

        let dbQuery = this.supabase
          .getAdminClient()
          .schema('backend')
          .from('booking')
          .select(
            `
            id, transaction_id, order_id, user_id, status, product_type, booking_number, 
            created_at, updated_at
          `,
            { count: 'exact' },
          );

        if (query.status) dbQuery = dbQuery.eq('status', query.status);
        if (query.product_type) dbQuery = dbQuery.eq('product_type', query.product_type);
        if (query.user_id) dbQuery = dbQuery.eq('user_id', query.user_id);
        if (query.start_date) dbQuery = dbQuery.gte('created_at', query.start_date);
        if (query.end_date) dbQuery = dbQuery.lte('created_at', query.end_date);
        if (query.search) {
          dbQuery = dbQuery.or(
            `booking_number.ilike.%${query.search}%,transaction_id.ilike.%${query.search}%`,
          );
        }

        dbQuery = dbQuery.order('created_at', { ascending: false });
        dbQuery = dbQuery.range(offset, offset + limit - 1);

        const { data, error, count } = await dbQuery;

        if (error) this.throwError('BOOKINGS_FETCH_ERROR', error.message, HttpStatus.BAD_REQUEST);

        // Kullanıcı bilgilerini ekle
        const userIds = [...new Set(data?.map((b) => b.user_id).filter(Boolean))];
        let usersMap: Record<string, any> = {};

        if (userIds.length > 0) {
          const { data: users } = await this.supabase
            .getAdminClient()
            .from('user_profiles')
            .select('id, email, full_name')
            .in('id', userIds);

          usersMap = (users || []).reduce(
            (acc, u) => {
              acc[u.id] = u;
              return acc;
            },
            {} as Record<string, any>,
          );
        }

        const enrichedData = data?.map((b) => ({
          ...b,
          user: b.user_id ? usersMap[b.user_id] || null : null,
        }));

        return {
          success: true,
          data: enrichedData,
          pagination: this.getPagination(page, limit, count || 0),
        };
      },
      'BOOKINGS_FETCH_ERROR',
      'Rezervasyonlar getirilemedi',
    );
  }

  async getBooking(id: string) {
    return this.handleRequest(
      async () => {
        const { data: booking, error } = await this.supabase
          .getAdminClient()
          .schema('backend')
          .from('booking')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !booking) {
          this.throwError('BOOKING_NOT_FOUND', 'Rezervasyon bulunamadı', HttpStatus.NOT_FOUND);
        }

        // İlişkili verileri al
        const [userResult, emailsResult, smsResult] = await Promise.all([
          booking.user_id
            ? this.supabase
                .getAdminClient()
                .from('user_profiles')
                .select('id, email, full_name')
                .eq('id', booking.user_id)
                .single()
            : Promise.resolve({ data: null }),
          this.supabase
            .getAdminClient()
            .schema('backend')
            .from('booking_email')
            .select('*')
            .eq('booking_id', id)
            .order('created_at', { ascending: false }),
          this.supabase
            .getAdminClient()
            .schema('backend')
            .from('booking_sms')
            .select('*')
            .eq('booking_id', id)
            .order('created_at', { ascending: false }),
        ]);

        return {
          success: true,
          data: {
            ...booking,
            user: userResult.data,
            emails: emailsResult.data || [],
            sms: smsResult.data || [],
          },
        };
      },
      'BOOKING_FETCH_ERROR',
      'Rezervasyon getirilemedi',
    );
  }

  async updateBookingStatus(id: string, dto: UpdateBookingStatusDto, adminId: string) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .schema('backend')
          .from('booking')
          .update({ status: dto.status, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          this.throwError('BOOKING_UPDATE_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        this.logger.log({
          message: 'Admin: Rezervasyon durumu güncellendi',
          adminId,
          bookingId: id,
          newStatus: dto.status,
          reason: dto.reason,
        });

        return { success: true, data };
      },
      'BOOKING_UPDATE_ERROR',
      'Rezervasyon durumu güncellenemedi',
    );
  }

  // ==================== TRANSACTIONS ====================

  async getTransactions(query: TransactionQueryDto) {
    return this.handleRequest(
      async () => {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const offset = (page - 1) * limit;

        let dbQuery = this.supabase
          .getAdminClient()
          .from('user_transaction')
          .select('*', { count: 'exact' });

        if (query.status) dbQuery = dbQuery.eq('status', query.status);
        if (query.user_id) dbQuery = dbQuery.eq('user_id', query.user_id);
        if (query.start_date) dbQuery = dbQuery.gte('created_at', query.start_date);
        if (query.end_date) dbQuery = dbQuery.lte('created_at', query.end_date);
        if (query.search) dbQuery = dbQuery.ilike('order_id', `%${query.search}%`);

        dbQuery = dbQuery.order('created_at', { ascending: false });
        dbQuery = dbQuery.range(offset, offset + limit - 1);

        const { data, error, count } = await dbQuery;

        if (error) {
          this.throwError('TRANSACTIONS_FETCH_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        // Kullanıcı bilgilerini ekle
        const userIds = [...new Set(data?.map((t) => t.user_id).filter(Boolean))];
        let usersMap: Record<string, any> = {};

        if (userIds.length > 0) {
          const { data: users } = await this.supabase
            .getAdminClient()
            .from('user_profiles')
            .select('id, email, full_name')
            .in('id', userIds);

          usersMap = (users || []).reduce(
            (acc, u) => {
              acc[u.id] = u;
              return acc;
            },
            {} as Record<string, any>,
          );
        }

        const enrichedData = data?.map((t) => ({
          ...t,
          user: t.user_id ? usersMap[t.user_id] || null : null,
        }));

        return {
          success: true,
          data: enrichedData,
          pagination: this.getPagination(page, limit, count || 0),
        };
      },
      'TRANSACTIONS_FETCH_ERROR',
      'İşlemler getirilemedi',
    );
  }

  async getTransaction(id: string) {
    return this.handleRequest(
      async () => {
        const { data: transaction, error } = await this.supabase
          .getAdminClient()
          .from('user_transaction')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !transaction) {
          this.throwError('TRANSACTION_NOT_FOUND', 'İşlem bulunamadı', HttpStatus.NOT_FOUND);
        }

        // Kullanıcı ve booking bilgisini al
        const [userResult, bookingResult] = await Promise.all([
          transaction.user_id
            ? this.supabase
                .getAdminClient()
                .from('user_profiles')
                .select('id, email, full_name')
                .eq('id', transaction.user_id)
                .single()
            : Promise.resolve({ data: null }),
          transaction.order_id
            ? this.supabase
                .getAdminClient()
                .schema('backend')
                .from('booking')
                .select('id, booking_number, status')
                .eq('order_id', transaction.order_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        return {
          success: true,
          data: {
            ...transaction,
            user: userResult.data,
            booking: bookingResult.data,
          },
        };
      },
      'TRANSACTION_FETCH_ERROR',
      'İşlem getirilemedi',
    );
  }

  async refundTransaction(id: string, dto: RefundTransactionDto, adminId: string) {
    return this.handleRequest(
      async () => {
        // İşlemi kontrol et
        const { data: transaction, error: fetchError } = await this.supabase
          .getAdminClient()
          .from('user_transaction')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError || !transaction) {
          this.throwError('TRANSACTION_NOT_FOUND', 'İşlem bulunamadı', HttpStatus.NOT_FOUND);
        }

        if (transaction.status !== 'success') {
          this.throwError(
            'REFUND_NOT_ALLOWED',
            'Sadece başarılı işlemler iade edilebilir',
            HttpStatus.BAD_REQUEST,
          );
        }

        if (dto.amount > transaction.amount) {
          this.throwError(
            'REFUND_AMOUNT_EXCEEDED',
            'İade tutarı işlem tutarından fazla olamaz',
            HttpStatus.BAD_REQUEST,
          );
        }

        // İade kaydı oluştur
        const { data: refund, error: refundError } = await this.supabase
          .getAdminClient()
          .from('user_transaction')
          .insert([
            {
              user_id: transaction.user_id,
              order_id: transaction.order_id,
              amount: dto.amount,
              currency: transaction.currency,
              status: 'pending',
              transaction_type: 'refund',
              payment_method: transaction.payment_method,
            },
          ])
          .select()
          .single();

        if (refundError) {
          this.throwError('REFUND_ERROR', refundError.message, HttpStatus.BAD_REQUEST);
        }

        this.logger.log({
          message: 'Admin: İade işlemi başlatıldı',
          adminId,
          transactionId: id,
          refundId: refund.id,
          amount: dto.amount,
          reason: dto.reason,
        });

        return {
          success: true,
          data: {
            refund_id: refund.id,
            status: 'pending',
            amount: dto.amount,
            created_at: refund.created_at,
          },
        };
      },
      'REFUND_ERROR',
      'İade işlemi başlatılamadı',
    );
  }

  // ==================== DASHBOARD STATS ====================

  async getDashboardStats(query: DashboardStatsQueryDto) {
    return this.handleRequest(
      async () => {
        const period = query.period || 'all';
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

        // Paralel sorgular
        const [
          usersTotal,
          usersToday,
          usersWeek,
          usersMonth,
          bookingsTotal,
          bookingsConfirmed,
          bookingsCancelled,
          bookingsToday,
          bookingsWeek,
          bookingsMonth,
          transactionsSuccess,
          transactionsFailed,
          transactionsRefunded,
          transactionsToday,
          transactionsWeek,
          transactionsMonth,
        ] = await Promise.all([
          this.supabase
            .getAdminClient()
            .from('user_profiles')
            .select('id', { count: 'exact', head: true }),
          this.supabase
            .getAdminClient()
            .from('user_profiles')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', today),
          this.supabase
            .getAdminClient()
            .from('user_profiles')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', weekAgo),
          this.supabase
            .getAdminClient()
            .from('user_profiles')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', monthAgo),
          this.supabase
            .getAdminClient()
            .schema('backend')
            .from('booking')
            .select('id', { count: 'exact', head: true }),
          this.supabase
            .getAdminClient()
            .schema('backend')
            .from('booking')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'CONFIRMED'),
          this.supabase
            .getAdminClient()
            .schema('backend')
            .from('booking')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'CANCELLED'),
          this.supabase
            .getAdminClient()
            .schema('backend')
            .from('booking')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', today),
          this.supabase
            .getAdminClient()
            .schema('backend')
            .from('booking')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', weekAgo),
          this.supabase
            .getAdminClient()
            .schema('backend')
            .from('booking')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', monthAgo),
          this.supabase
            .getAdminClient()
            .from('user_transaction')
            .select('amount')
            .eq('status', 'success')
            .eq('transaction_type', 'payment'),
          this.supabase
            .getAdminClient()
            .from('user_transaction')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'failed'),
          this.supabase
            .getAdminClient()
            .from('user_transaction')
            .select('amount')
            .eq('transaction_type', 'refund'),
          this.supabase
            .getAdminClient()
            .from('user_transaction')
            .select('amount')
            .eq('status', 'success')
            .gte('created_at', today),
          this.supabase
            .getAdminClient()
            .from('user_transaction')
            .select('amount')
            .eq('status', 'success')
            .gte('created_at', weekAgo),
          this.supabase
            .getAdminClient()
            .from('user_transaction')
            .select('amount')
            .eq('status', 'success')
            .gte('created_at', monthAgo),
        ]);

        const calcTotal = (data: any[] | null) =>
          data?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

        return {
          success: true,
          data: {
            users: {
              total: usersTotal.count || 0,
              new_today: usersToday.count || 0,
              new_this_week: usersWeek.count || 0,
              new_this_month: usersMonth.count || 0,
            },
            bookings: {
              total: bookingsTotal.count || 0,
              confirmed: bookingsConfirmed.count || 0,
              cancelled: bookingsCancelled.count || 0,
              today: bookingsToday.count || 0,
              this_week: bookingsWeek.count || 0,
              this_month: bookingsMonth.count || 0,
            },
            transactions: {
              total_volume: calcTotal(transactionsSuccess.data),
              successful: transactionsSuccess.data?.length || 0,
              failed: transactionsFailed.count || 0,
              today_volume: calcTotal(transactionsToday.data),
              today_count: transactionsToday.data?.length || 0,
              this_week_volume: calcTotal(transactionsWeek.data),
              this_week_count: transactionsWeek.data?.length || 0,
              this_month_volume: calcTotal(transactionsMonth.data),
              this_month_count: transactionsMonth.data?.length || 0,
            },
            revenue: {
              total: calcTotal(transactionsSuccess.data),
              today: calcTotal(transactionsToday.data),
              this_week: calcTotal(transactionsWeek.data),
              this_month: calcTotal(transactionsMonth.data),
              refunds: calcTotal(transactionsRefunded.data),
            },
          },
        };
      },
      'DASHBOARD_STATS_ERROR',
      'Dashboard istatistikleri getirilemedi',
    );
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

        // Cache temizle
        await this.clearCmsCache('blogs');

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
        const updateData = { ...dto, updated_at: new Date().toISOString() };
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

  // ==================== CONTACT MESSAGES ====================

  async getContactMessages(query: CmsQueryDto) {
    return this.handleRequest(
      async () => {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const offset = (page - 1) * limit;

        let dbQuery = this.supabase
          .getAdminClient()
          .from('contact')
          .select('*', { count: 'exact' });

        if (query.search) {
          dbQuery = dbQuery.or(
            `name.ilike.%${query.search}%,email.ilike.%${query.search}%,subject.ilike.%${query.search}%`,
          );
        }

        dbQuery = dbQuery.order('created_at', { ascending: false });
        dbQuery = dbQuery.range(offset, offset + limit - 1);

        const { data, error, count } = await dbQuery;

        if (error) {
          this.throwError('CONTACT_FETCH_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        return {
          success: true,
          data,
          pagination: this.getPagination(page, limit, count || 0),
        };
      },
      'CONTACT_FETCH_ERROR',
      'İletişim mesajları getirilemedi',
    );
  }

  async markContactAsRead(id: string, adminId: string) {
    return this.handleRequest(
      async () => {
        const { data, error } = await this.supabase
          .getAdminClient()
          .from('contact')
          .update({ is_read: true })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          this.throwError('CONTACT_UPDATE_ERROR', error.message, HttpStatus.BAD_REQUEST);
        }

        this.logger.log({ message: 'Admin: İletişim mesajı okundu', adminId, contactId: id });

        return { success: true, data };
      },
      'CONTACT_UPDATE_ERROR',
      'İletişim mesajı güncellenemedi',
    );
  }

  // ==================== CACHE HELPERS ====================

  private async clearCmsCache(type: string) {
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
