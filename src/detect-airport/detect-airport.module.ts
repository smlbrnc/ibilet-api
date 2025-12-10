import { Module } from '@nestjs/common';
import { DetectAirportController } from './detect-airport.controller';
import { DetectAirportService } from './detect-airport.service';

@Module({
  controllers: [DetectAirportController],
  providers: [DetectAirportService],
  exports: [DetectAirportService],
})
export class DetectAirportModule {}
