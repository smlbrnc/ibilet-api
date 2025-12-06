import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FoursquareService } from './foursquare.service';
import { FoursquareController } from './foursquare.controller';
import { LoggerService } from '../common/logger/logger.service';

@Module({
  imports: [HttpModule],
  controllers: [FoursquareController],
  providers: [FoursquareService, LoggerService],
  exports: [FoursquareService],
})
export class FoursquareModule {}
