import { IsString, MinLength } from 'class-validator';

export class LocationSearchDto {
  @IsString()
  @MinLength(2)
  query: string;
}

