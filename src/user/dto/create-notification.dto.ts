import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsObject } from 'class-validator';

export enum NotificationType {
  BOOKING = 'booking',
  PROMOTION = 'promotion',
  SYSTEM = 'system',
  REMINDER = 'reminder',
  ALERT = 'alert',
}

export class CreateNotificationDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Kullanıcı ID' })
  @IsUUID()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({ example: 'Rezervasyonunuz onaylandı', description: 'Bildirim başlığı' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    example: 'Rezervasyon numaranız: ABC123',
    description: 'Bildirim mesajı',
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    enum: NotificationType,
    example: NotificationType.BOOKING,
    description: 'Bildirim tipi',
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({
    example: '/bookings/123',
    description: 'Aksiyon URL (bildirime tıklandığında yönlendirilecek)',
  })
  @IsOptional()
  @IsString()
  action_url?: string;

  @ApiPropertyOptional({
    example: { booking_id: '123', status: 'confirmed' },
    description: 'Ek veri (JSON)',
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
