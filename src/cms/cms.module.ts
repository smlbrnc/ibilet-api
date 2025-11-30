import { Module } from '@nestjs/common';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';
import { LoggerService } from '../common/logger/logger.service';

@Module({
  controllers: [CmsController],
  providers: [CmsService, LoggerService],
  exports: [CmsService],
})
export class CmsModule {}

