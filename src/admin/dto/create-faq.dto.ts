import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFaqDto {
  @ApiProperty()
  @IsString()
  question_tr: string;

  @ApiProperty()
  @IsString()
  answer_tr: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  question_en?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  answer_en?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class UpdateFaqDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  question_tr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  answer_tr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  question_en?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  answer_en?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priority?: number;
}
