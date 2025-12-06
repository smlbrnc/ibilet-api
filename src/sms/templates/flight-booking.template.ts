/**
 * Uçuş rezervasyonu SMS template'i
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

interface FlightInfo {
  route: number; // 1 = Gidiş, 2 = Dönüş
  flightNo: string;
  departure: {
    airport: { code: string };
    date: string;
  };
  arrival: {
    airport: { code: string };
  };
}

interface Service {
  pnrNo: string;
  productType: number;
  isExtraService: boolean;
  serviceDetails?: { flightInfo?: FlightInfo };
}

interface ReservationData {
  reservationInfo: { bookingNumber: string };
  services: Service[];
  travellers: Traveller[];
}

export interface FlightSmsResult {
  message: string;
  phone: string | null;
  passengerName: string;
  outboundPnr: string;
  returnPnr: string | null;
  reservationNumber: string;
}

// Tarih formatlama: 30.11.2025 10:00 veya 30.11 10:00
const formatDate = (dateStr: string, shortFormat = false): string => {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  if (shortFormat) {
    return `${day}.${month} ${hours}:${minutes}`;
  }
  return `${day}.${month}.${year} ${hours}:${minutes}`;
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
export const buildFlightBookingSms = (reservationDetails: any): FlightSmsResult => {
  const reservationData: ReservationData = reservationDetails?.body?.reservationData;

  if (!reservationData) {
    return {
      message: '',
      phone: null,
      passengerName: '',
      outboundPnr: '',
      returnPnr: null,
      reservationNumber: '',
    };
  }

  const { reservationInfo, services, travellers } = reservationData;

  // Leader yolcuyu bul
  const leader = travellers?.find((t) => t.isLeader);
  if (!leader) {
    return {
      message: '',
      phone: null,
      passengerName: '',
      outboundPnr: '',
      returnPnr: null,
      reservationNumber: '',
    };
  }

  const phone = formatPhone(leader);
  const passengerName = `${leader.name} ${leader.surname}`.toUpperCase();
  const reservationNumber = reservationInfo?.bookingNumber || '';

  // Uçuş servislerini ayır (productType: 3 ve isExtraService: false)
  const flightServices = services?.filter((s) => s.productType === 3 && !s.isExtraService) || [];

  // Gidiş ve dönüş uçuşlarını grupla
  const outboundFlights = flightServices.filter((s) => s.serviceDetails?.flightInfo?.route === 1);
  const returnFlights = flightServices.filter((s) => s.serviceDetails?.flightInfo?.route === 2);

  const outboundFlight = outboundFlights[0];
  const returnFlight = returnFlights[0];

  const outboundPnr = outboundFlight?.pnrNo || '';
  const returnPnr = returnFlight?.pnrNo || null;

  let message = '';

  if (outboundFlight?.serviceDetails?.flightInfo) {
    const outbound = outboundFlight.serviceDetails.flightInfo;
    const depCode = outbound.departure.airport.code;
    const arrCode = outbound.arrival.airport.code;
    const flightNo = outbound.flightNo;

    if (returnFlight?.serviceDetails?.flightInfo) {
      // Gidiş-Dönüş formatı
      const returnInfo = returnFlight.serviceDetails.flightInfo;
      const retDepCode = returnInfo.departure.airport.code;
      const retArrCode = returnInfo.arrival.airport.code;
      const retFlightNo = returnInfo.flightNo;

      message = `${passengerName}, GIDIS: ${formatDate(outbound.departure.date, true)} ${depCode}-${arrCode} ${flightNo} PNR: ${outboundPnr} | DONUS: ${formatDate(returnInfo.departure.date, true)} ${retDepCode}-${retArrCode} ${retFlightNo} PNR: ${returnPnr} | BILET: IBILET.COM/R/${reservationNumber}`;
    } else {
      // Tek yön formatı
      message = `${passengerName}, GIDIS UCUSUNUZ ONAYLANDI:\n\n${formatDate(outbound.departure.date)} ${depCode}-${arrCode} ${flightNo} PNR: ${outboundPnr}`;
    }
  }

  return {
    message,
    phone,
    passengerName,
    outboundPnr,
    returnPnr,
    reservationNumber,
  };
};
