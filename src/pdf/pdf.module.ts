import { Module } from '@nestjs/common';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';
import { LoggerService } from '../common/logger/logger.service';
import { SupabaseModule } from '../common/services/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [PdfController],
  providers: [PdfService, LoggerService],
  exports: [PdfService],
})
export class PdfModule {}
