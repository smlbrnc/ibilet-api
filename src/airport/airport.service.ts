import { Injectable, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface Airport {
  type: string;
  name: string;
  lat: number;
  lon: number;
}

export interface NearestAirportResult {
  airport: Airport;
  distance: number;
}

@Injectable()
export class AirportService implements OnModuleInit {
  private airports: Airport[] = [];

  onModuleInit() {
    // JSON dosyasını oku ve cache'e al
    const filePath = join(__dirname, '..', 'data', 'airport.json');
    const fileContent = readFileSync(filePath, 'utf-8');
    this.airports = JSON.parse(fileContent);
  }

  /**
   * Haversine formülü ile iki koordinat arasındaki mesafeyi hesaplar (km cinsinden)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Dünya'nın yarıçapı (km)
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * Derece cinsinden açıyı radyan'a çevirir
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Verilen koordinatlara en yakın havalimanını bulur
   */
  findNearestAirport(
    latitude: number,
    longitude: number,
    types?: string[],
  ): NearestAirportResult {
    let nearestAirport: Airport | null = null;
    let minDistance = Infinity;

    // Tip filtresi uygula
    const filteredAirports = types
      ? this.airports.filter((airport) => types.includes(airport.type))
      : this.airports; // Type gönderilmemişse tüm havalimanlarını kontrol et

    // En yakın havalimanını bul
    for (const airport of filteredAirports) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        airport.lat,
        airport.lon,
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestAirport = airport;
      }
    }

    if (!nearestAirport) {
      throw new Error('Havalimanı bulunamadı');
    }

    return {
      airport: nearestAirport,
      distance: Math.round(minDistance * 100) / 100, // 2 ondalık basamak
    };
  }
}

