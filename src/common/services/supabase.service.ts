import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private adminClient: SupabaseClient;
  private anonClient: SupabaseClient;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('SupabaseService');
  }

  onModuleInit() {
    const url = this.config.get<string>('supabase.url');
    const anonKey = this.config.get<string>('supabase.anonKey');
    const serviceRoleKey = this.config.get<string>('supabase.serviceRoleKey');

    if (!url || !anonKey) {
      this.logger.warn('Supabase URL veya Anon Key bulunamadı');
      return;
    }

    this.anonClient = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
    });

    if (serviceRoleKey) {
      this.adminClient = createClient(url, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      this.logger.log('Supabase admin client başlatıldı');
    } else {
      this.logger.warn('Supabase Service Role Key bulunamadı, admin client oluşturulamadı');
    }

    this.logger.log('Supabase client başlatıldı');
  }

  getAdminClient(): SupabaseClient {
    if (!this.adminClient) {
      throw new Error('Supabase admin client başlatılmamış. Service Role Key kontrol edin.');
    }
    return this.adminClient;
  }

  getAnonClient(): SupabaseClient {
    if (!this.anonClient) {
      throw new Error('Supabase anon client başlatılmamış. URL ve Anon Key kontrol edin.');
    }
    return this.anonClient;
  }
}
