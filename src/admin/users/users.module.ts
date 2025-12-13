import { Module } from '@nestjs/common';
import { UsersController, RolesController } from './users.controller';
import { UsersService } from './users.service';
import { SupabaseModule } from '../../common/services/supabase.module';
import { LoggerService } from '../../common/logger/logger.service';

@Module({
  imports: [SupabaseModule],
  controllers: [UsersController, RolesController],
  providers: [UsersService, LoggerService],
  exports: [UsersService],
})
export class UsersModule {}

