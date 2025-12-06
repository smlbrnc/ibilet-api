/**
 * Otel rezervasyonu SMS template'i
 */

interface ContactPhone {
  countryCode?: string;
  areaCode?: string;
  phoneNumber?: string;
}

interface Traveller {
  name: string;
  surname: string;
  isLeader: boolean;
  address?: {
    phone?: string;
    contactPhone?: ContactPhone;
  };
}

interface ServiceDetails {
  room?: string;
  board?: string;
  night?: number;
  hotelDetail?: { name: string };
}

interface Service {
  name: string;
  productType: number;
  isExtraService: boolean;
  beginDate: string;
  endDate: string;
  supplierBookingNumber?: string;
  serviceDetails?: ServiceDetails;
}

interface ReservationData {
  reservationInfo: { bookingNumber: string };
  services: Service[];
  travellers: Traveller[];
}

export interface HotelSmsResult {
  message: string;
  phone: string | null;
  guestName: string;
  voucherNo: string;
  hotelName: string;
  reservationNumber: string;
}

// Tarih formatlama: 30.11
const formatDateShort = (dateStr: string): string => {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month}`;
};

// Telefon numarası formatlama
const formatPhone = (traveller: Traveller): string | null => {
  const contactPhone = traveller.address?.contactPhone;

  if (contactPhone?.countryCode && contactPhone?.phoneNumber) {
    const areaCode = contactPhone.areaCode || '';
    return `${contactPhone.countryCode}${areaCode}${contactPhone.phoneNumber}`;
  }

  if (traveller.address?.phone) {
    return traveller.address.phone;
  }

  return null;
};

// Ana template fonksiyonu
export const buildHotelBookingSms = (reservationDetails: any): HotelSmsResult => {
  const reservationData: ReservationData = reservationDetails?.body?.reservationData;

  if (!reservationData) {
    return {
      message: '',
      phone: null,
      guestName: '',
      voucherNo: '',
      hotelName: '',
      reservationNumber: '',
    };
  }

  const { reservationInfo, services, travellers } = reservationData;

  // Leader misafiri bul
  const leader = travellers?.find((t) => t.isLeader);
  if (!leader) {
    return {
      message: '',
      phone: null,
      guestName: '',
      voucherNo: '',
      hotelName: '',
      reservationNumber: '',
    };
  }

  const phone = formatPhone(leader);
  const guestName = `${leader.name} ${leader.surname}`.toUpperCase();
  const reservationNumber = reservationInfo?.bookingNumber || '';

  // Otel servisini bul (productType: 2 ve isExtraService: false)
  const hotelService = services?.find((s) => s.productType === 2 && !s.isExtraService);

  if (!hotelService) {
    return {
      message: '',
      phone: null,
      guestName: '',
      voucherNo: '',
      hotelName: '',
      reservationNumber: '',
    };
  }

  const hotelName = hotelService.serviceDetails?.hotelDetail?.name || hotelService.name || '-';
  const voucherNo = hotelService.supplierBookingNumber || reservationNumber;
  const checkIn = formatDateShort(hotelService.beginDate);
  const checkOut = formatDateShort(hotelService.endDate);
  const nightCount = hotelService.serviceDetails?.night || 0;
  const guestCount = travellers?.length || 0;

  // SMS formatı
  const message = `${guestName}, OTEL REZERVASYONUNUZ ONAYLANDI: ${hotelName} | Giris: ${checkIn} Cikis: ${checkOut} (${nightCount} Gece, ${guestCount} Misafir) | Voucher: ${voucherNo} | DETAY: IBILET.COM/R/${reservationNumber}`;

  return {
    message,
    phone,
    guestName,
    voucherNo,
    hotelName,
    reservationNumber,
  };
};
