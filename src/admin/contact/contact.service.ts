import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SupabaseService } from '../../common/services/supabase.service';
import { LoggerService } from '../../common/logger/logger.service';
import { BaseAdminService } from '../base/base-admin.service';
import { CmsQueryDto } from '../dto/admin-query.dto';

@Injectable()
export class ContactService extends BaseAdminService {
  constructor(
    supabase: SupabaseService,
    logger: LoggerService,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
  ) {
    super(supabase, logger, cacheManager);
    this.logger.setContext('ContactService');
  }

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
}

