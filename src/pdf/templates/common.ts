/**
 * PDF template'leri için ortak tipler ve yardımcı fonksiyonlar
 */

import * as path from 'path';

// ============================================================================
// FONT PATHS (Türkçe karakter desteği için Roboto)
// ============================================================================

const FONTS_DIR = path.join(process.cwd(), 'storage', 'fonts');

export const FONTS = {
  regular: path.join(FONTS_DIR, 'Roboto-Regular.ttf'),
  bold: path.join(FONTS_DIR, 'Roboto-Bold.ttf'),
};

// ============================================================================
// INTERFACES
// ============================================================================

export interface Traveller {
  name: string;
  surname: string;
  type: number; // 1 = Yetişkin, 2 = Çocuk, 3 = Bebek
  isLeader: boolean;
  birthDate?: string;
  address?: { email?: string };
}

export interface ReservationInfo {
  bookingNumber: string;
  agencyReservationNumber?: string;
  totalPrice: { amount: number; currency: string };
  departureCity: { name: string };
  arrivalCity: { name: string };
  beginDate: string;
  endDate: string;
}

export interface ReservationData {
  reservationInfo: ReservationInfo;
  services: any[];
  travellers: Traveller[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Tarih formatı: "30 Kas 2025" */
export const formatDateShort = (dateStr: string): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Saat formatı: "09:00" */
export const formatTime = (dateStr: string): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
};

/** Süre formatı: "1s 10dk" */
export const formatDuration = (minutes: number): string => {
  if (!minutes) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}s ${mins}dk`;
  if (hours > 0) return `${hours}s`;
  return `${mins}dk`;
};

/** Fiyat formatı: "8.222,52 TRY" */
export const formatPrice = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0) + ' ' + (currency || 'TRY');
};

/** Yolcu tipi metni */
export const getTravellerTypeText = (type: number): string => {
  switch (type) {
    case 1: return 'Yetişkin';
    case 2: return 'Çocuk';
    case 3: return 'Bebek';
    default: return 'Yolcu';
  }
};
