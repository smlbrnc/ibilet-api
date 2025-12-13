import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SupabaseService } from '../../common/services/supabase.service';
import { LoggerService } from '../../common/logger/logger.service';
import { BaseAdminService } from '../base/base-admin.service';
import { TransactionQueryDto } from '../dto/admin-query.dto';
import { RefundTransactionDto } from '../dto/refund-transaction.dto';

@Injectable()
export class TransactionsService extends BaseAdminService {
  constructor(
    supabase: SupabaseService,
    logger: LoggerService,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
  ) {
    super(supabase, logger, cacheManager);
    this.logger.setContext('TransactionsService');
  }

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
}

