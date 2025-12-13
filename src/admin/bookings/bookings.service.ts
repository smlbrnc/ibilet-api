import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SupabaseService } from '../../common/services/supabase.service';
import { LoggerService } from '../../common/logger/logger.service';
import { BaseAdminService } from '../base/base-admin.service';
import { BookingQueryDto } from '../dto/admin-query.dto';
import { UpdateBookingStatusDto } from '../dto/update-booking-status.dto';

@Injectable()
export class BookingsService extends BaseAdminService {
  constructor(
    supabase: SupabaseService,
    logger: LoggerService,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
  ) {
    super(supabase, logger, cacheManager);
    this.logger.setContext('BookingsService');
  }

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
}

