import { IsObject, IsOptional, IsString, IsBoolean, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Consent objesi için DTO
 */
export class ConsentDto {
  @ApiProperty({ description: 'Gerekli çerezler (her zaman true olmalı)' })
  @IsBoolean()
  necessary: boolean;

  @ApiProperty({ description: 'Analitik çerezler' })
  @IsBoolean()
  analytics: boolean;

  @ApiProperty({ description: 'Pazarlama çerezleri' })
  @IsBoolean()
  marketing: boolean;
}

/**
 * Cookie Consent oluşturma DTO
 */
export class CreateCookieConsentDto {
  @ApiPropertyOptional({ description: 'Kullanıcı ID (opsiyonel, giriş yapmış kullanıcılar için)' })
  @IsOptional()
  @IsUUID()
  userId?: string | null;

  @ApiProperty({ description: 'Çerez onayları', type: ConsentDto })
  @IsObject()
  @ValidateNested()
  @Type(() => ConsentDto)
  consent: ConsentDto;
}

/**
 * Cookie Consent güncelleme DTO
 */
export class UpdateCookieConsentDto {
  @ApiPropertyOptional({ description: 'Kullanıcı ID (opsiyonel, giriş yapmış kullanıcılar için)' })
  @IsOptional()
  @IsUUID()
  userId?: string | null;

  @ApiProperty({ description: 'Çerez onayları', type: ConsentDto })
  @IsObject()
  @ValidateNested()
  @Type(() => ConsentDto)
  consent: ConsentDto;
}

