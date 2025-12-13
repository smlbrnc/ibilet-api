import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateModeratorPermissionsDto {
  @ApiProperty({
    description: 'Moderator izinleri (key-value çiftleri)',
    example: {
      'users.write': true,
      'bookings.update': false,
      'transactions.refund': true,
      'cms.write': false,
    },
  })
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  permissions: Record<string, boolean>;
}

