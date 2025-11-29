/**
 * Booking confirmation SMS template selector
 * productType'a göre uygun template'i seçer
 *
 * productType: 2 = Otel
 * productType: 3 = Uçuş
 */

import { buildFlightBookingSms, FlightSmsResult } from './flight-booking.template';
import { buildHotelBookingSms, HotelSmsResult } from './hotel-booking.template';

export interface SmsResult {
  message: string;
  phone: string | null;
  outboundPnr?: string;
  returnPnr?: string | null;
  voucherNo?: string;
  reservationNumber: string;
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
 * Rezervasyon onay SMS'i oluştur
 * productType'a göre uygun template'i seçer
 */
export const buildBookingSmsMessage = (reservationDetails: any): SmsResult => {
  const productType = getProductType(reservationDetails);

  switch (productType) {
    case 2: {
      // Otel rezervasyonu
      const hotelResult: HotelSmsResult = buildHotelBookingSms(reservationDetails);
      return {
        message: hotelResult.message,
        phone: hotelResult.phone,
        voucherNo: hotelResult.voucherNo,
        reservationNumber: hotelResult.reservationNumber,
      };
    }
    case 3: {
      // Uçuş rezervasyonu
      const flightResult: FlightSmsResult = buildFlightBookingSms(reservationDetails);
      return {
        message: flightResult.message,
        phone: flightResult.phone,
        outboundPnr: flightResult.outboundPnr,
        returnPnr: flightResult.returnPnr,
        reservationNumber: flightResult.reservationNumber,
      };
    }
    default: {
      // Bilinmeyen productType - varsayılan olarak uçuş template'i kullan
      console.warn(`Unknown productType: ${productType}, using flight template as default`);
      const defaultResult: FlightSmsResult = buildFlightBookingSms(reservationDetails);
      return {
        message: defaultResult.message,
        phone: defaultResult.phone,
        outboundPnr: defaultResult.outboundPnr,
        returnPnr: defaultResult.returnPnr,
        reservationNumber: defaultResult.reservationNumber,
      };
    }
  }
};

// Re-export individual templates
export { buildFlightBookingSms, FlightSmsResult } from './flight-booking.template';
export { buildHotelBookingSms, HotelSmsResult } from './hotel-booking.template';

