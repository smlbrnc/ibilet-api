import { PartialType } from '@nestjs/swagger';
import { CreateTravellerDto } from './create-traveller.dto';

export class UpdateTravellerDto extends PartialType(CreateTravellerDto) {}
