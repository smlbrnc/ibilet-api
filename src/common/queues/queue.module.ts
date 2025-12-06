import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationProcessor } from './notification.processor';
import { BullBoardConfigModule } from './bull-board.module';
import { LoggerService } from '../logger/logger.service';
import { EmailModule } from '../../email/email.module';
import { SmsModule } from '../../sms/sms.module';
import { PdfModule } from '../../pdf/pdf.module';
import { SupabaseModule } from '../services/supabase.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'notifications',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100, // Son 100 başarılı job'u sakla
        removeOnFail: false, // Başarısız job'ları sakla (debug için)
      },
    }),
    BullBoardConfigModule,
    EmailModule,
    SmsModule,
    PdfModule,
    SupabaseModule,
  ],
  providers: [NotificationProcessor, LoggerService],
  exports: [BullModule],
})
export class QueueModule {}
