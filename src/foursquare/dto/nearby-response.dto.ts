import { ApiProperty } from '@nestjs/swagger';
import { NearbyPlaceDto } from './nearby-place.dto';

export class NearbyGroupedDataDto {
  @ApiProperty({
    description: 'Yürüme mesafesindeki yerler (en yakın 5)',
    type: [NearbyPlaceDto],
    example: [],
  })
  walkingDistance: NearbyPlaceDto[];

  @ApiProperty({
    description: 'En yakın simge yapılar',
    type: [NearbyPlaceDto],
    example: [],
  })
  nearbyLandmarks: NearbyPlaceDto[];
}

export class NearbyGroupedResponseDto {
  @ApiProperty({
    description: 'İsteğin başarılı olup olmadığı',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Gruplara ayrılmış yer verileri',
    type: NearbyGroupedDataDto,
  })
  data: NearbyGroupedDataDto;

  @ApiProperty({
    description: 'İstek kimliği',
    example: '4f9f7b49-7ec9-4b4a-baa6-47e5f91d120f',
  })
  requestId: string;
}

