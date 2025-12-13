import { Module } from '@nestjs/common';
import { SupabaseModule } from '../common/services/supabase.module';
import { LoggerService } from '../common/logger/logger.service';
import { UsersModule } from './users/users.module';
import { BookingsModule } from './bookings/bookings.module';
import { TransactionsModule } from './transactions/transactions.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CmsAdminModule } from './cms/cms-admin.module';
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [
    SupabaseModule,
    UsersModule,
    BookingsModule,
    TransactionsModule,
    DashboardModule,
    CmsAdminModule,
    ContactModule,
  ],
  providers: [LoggerService],
  exports: [
    UsersModule,
    BookingsModule,
    TransactionsModule,
    DashboardModule,
    CmsAdminModule,
    ContactModule,
  ],
})
export class AdminModule {}
