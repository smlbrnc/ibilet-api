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

export interface CarSearchResponse {
  searchID: string;
  items: unknown[];
  [key: string]: unknown;
}

export interface CarSearchResultResponse {
  code: string;
  searchID: string;
  extraProducts: unknown[];
  [key: string]: unknown;
}

