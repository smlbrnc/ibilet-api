import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SupabaseService } from '../../common/services/supabase.service';
import { LoggerService } from '../../common/logger/logger.service';
import { BaseAdminService } from '../base/base-admin.service';
import { DashboardStatsQueryDto } from '../dto/admin-query.dto';

@Injectable()
export class DashboardService extends BaseAdminService {
  constructor(
    supabase: SupabaseService,
    logger: LoggerService,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
  ) {
    super(supabase, logger, cacheManager);
    this.logger.setContext('DashboardService');
  }

  async getDashboardStats(query: DashboardStatsQueryDto) {
    return this.handleRequest(
      async () => {
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
}

