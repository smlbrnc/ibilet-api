import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { PaxModule } from './pax/pax.module';
import { HealthModule } from './health/health.module';
import { FoursquareModule } from './foursquare/foursquare.module';
import { AirportModule } from './airport/airport.module';
import { SupabaseModule } from './common/services/supabase.module';
import { PaymentModule } from './payment/payment.module';
import { EmailModule } from './email/email.module';
import { SmsModule } from './sms/sms.module';
import { PdfModule } from './pdf/pdf.module';
import { CmsModule } from './cms/cms.module';
import { ContactModule } from './contact/contact.module';
import { UserModule } from './user/user.module';
import { Yolcu360Module } from './yolcu360/yolcu360.module';
import { QueueModule } from './common/queues/queue.module';
import { AppController } from './app.controller';
import { AuthGuard } from './common/guards/auth.guard';
import { LoggerService } from './common/logger/logger.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env', // Fallback olarak .env dosyasını da oku
      ],
      isGlobal: true,
      load: [configuration],
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 3600000, // 1 saat default
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 saniye
        limit: 100, // 100 request
      },
    ]),
    AuthModule,
    PaxModule,
    HealthModule,
    FoursquareModule,
    AirportModule,
    SupabaseModule,
    PaymentModule,
    EmailModule,
    SmsModule,
    PdfModule,
    CmsModule,
    ContactModule,
    UserModule,
    Yolcu360Module,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Global rate limiting
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard, // Global authentication guard
    },
    LoggerService, // Global logger service (AuthGuard için gerekli)
  ],
})
export class AppModule {}

