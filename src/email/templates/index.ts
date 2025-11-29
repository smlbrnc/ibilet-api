/**
 * Booking confirmation email template selector
 * productType'a göre uygun template'i seçer
 *
 * productType: 2 = Otel
 * productType: 3 = Uçuş
 */

import { buildFlightBookingEmail } from './flight-booking.template';
import { buildHotelBookingEmail } from './hotel-booking.template';

export interface EmailResult {
  html: string;
  subject: string;
  toEmail: string | null;
}

/**
 * Rezervasyon detaylarından productType'ı belirle
 */
const getProductType = (reservationDetails: any): number | null => {
  const services = reservationDetails?.body?.reservationData?.services;
  if (!services || services.length === 0) return null;

  // İlk ana servisi bul (isExtraService: false)
  const mainService = services.find((s: any) => !s.isExtraService);
  return mainService?.productType || null;
};

/**
 * Rezervasyon onay emaili oluştur
 * productType'a göre uygun template'i seçer
 */
export const buildBookingConfirmationEmail = (reservationDetails: any): EmailResult => {
  const productType = getProductType(reservationDetails);

  switch (productType) {
    case 2:
      // Otel rezervasyonu
      return buildHotelBookingEmail(reservationDetails);
    case 3:
      // Uçuş rezervasyonu
      return buildFlightBookingEmail(reservationDetails);
    default:
      // Bilinmeyen productType - varsayılan olarak uçuş template'i kullan
      console.warn(`Unknown productType: ${productType}, using flight template as default`);
      return buildFlightBookingEmail(reservationDetails);
  }
};

// Re-export individual templates
export { buildFlightBookingEmail } from './flight-booking.template';
export { buildHotelBookingEmail } from './hotel-booking.template';

