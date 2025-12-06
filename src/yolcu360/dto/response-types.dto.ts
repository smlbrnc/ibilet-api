import { ApiProperty } from '@nestjs/swagger';

export interface LocationItem {
  placeId: string;
  name: string;
  country?: string;
  city?: string;
  type?: string;
}

export interface LocationResponse {
  items: LocationItem[];
}

export interface LocationDetailsResponse {
  placeId: string;
  name: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  country?: string;
  city?: string;
  type?: string;
}

// API yanıtı: { count: number, results: [...] } veya { data: { count: number, results: [...] } }
export interface CarSearchResponse {
  count?: number;
  results?: unknown[];
  items?: unknown[];
  data?: {
    count?: number;
    results?: unknown[];
    items?: unknown[];
  };
  [key: string]: unknown;
}

export interface CarSearchResultResponse {
  code: string;
  searchID: string;
  extraProducts: unknown[];
  [key: string]: unknown;
}

export interface CarSelectionResponse {
  id: string;
  code: string;
  search_id: string;
  car_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export class CarSelectionResponseDto {
  @ApiProperty({ description: 'Kayıt ID' })
  id: string;

  @ApiProperty({ description: 'Araç code' })
  code: string;

  @ApiProperty({ description: 'Search ID' })
  search_id: string;

  @ApiProperty({ description: 'Araç verisi (JSON)', type: Object })
  car_data: Record<string, any>;

  @ApiProperty({ description: 'Oluşturulma tarihi' })
  created_at: string;

  @ApiProperty({ description: 'Güncellenme tarihi' })
  updated_at: string;
}
