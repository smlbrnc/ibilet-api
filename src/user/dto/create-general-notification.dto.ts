import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject } from 'class-validator';
import { NotificationType } from './create-notification.dto';

export class CreateGeneralNotificationDto {
  @ApiProperty({ example: 'Yeni kampanya!', description: 'Bildirim başlığı' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    example: 'Tüm uçuşlarda %20 indirim fırsatı',
    description: 'Bildirim mesajı',
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    enum: NotificationType,
    example: NotificationType.PROMOTION,
    description: 'Bildirim tipi',
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({
    example: '/campaigns/summer-sale',
    description: 'Aksiyon URL (bildirime tıklandığında yönlendirilecek)',
  })
  @IsOptional()
  @IsString()
  action_url?: string;

  @ApiPropertyOptional({
    example: { campaign_id: '123', discount: 20 },
    description: 'Ek veri (JSON)',
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
