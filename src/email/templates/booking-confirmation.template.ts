/**
 * Rezervasyon onay email template'i
 * Uçuş bilgileri, yolcu listesi ve fiyat bilgilerini içerir
 */

interface Segment {
  flightNo: string;
  airline: { name: string; code: string };
  departure: {
    city: { name: string };
    airport: { code: string; name: string };
    date: string;
  };
  arrival: {
    city: { name: string };
    airport: { code: string; name: string };
    date: string;
  };
  duration: number;
  flightClass: { name: string };
}

interface FlightInfo {
  route: number; // 1 = Gidiş, 2 = Dönüş
  segments: Segment[];
  stopCount: number;
  departure: { city: { name: string }; airport: { code: string }; date: string };
  arrival: { city: { name: string }; airport: { code: string }; date: string };
  duration: number;
  airline: { name: string; code: string; logoFull?: string };
}

interface Service {
  pnrNo: string;
  productType: number;
  isExtraService: boolean;
  serviceDetails?: { flightInfo?: FlightInfo };
}

interface Traveller {
  name: string;
  surname: string;
  type: number; // 1 = Adult, 2 = Child, 3 = Infant
  isLeader: boolean;
  address?: { email?: string };
}

interface ReservationInfo {
  bookingNumber: string;
  totalPrice: { amount: number; currency: string };
  departureCity: { name: string };
  arrivalCity: { name: string };
  beginDate: string;
  endDate: string;
}

interface ReservationData {
  reservationInfo: ReservationInfo;
  services: Service[];
  travellers: Traveller[];
}

// Tarih formatlama
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// Saat formatlama
const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
};

// Süre formatlama (dakika -> saat dakika)
const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}s ${mins}dk` : `${mins}dk`;
};

// Fiyat formatlama
const formatPrice = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency || 'TRY',
  }).format(amount);
};

// Yolcu tipi
const getPassengerTypeLabel = (type: number): string => {
  switch (type) {
    case 1: return 'Yetişkin';
    case 2: return 'Çocuk';
    case 3: return 'Bebek';
    default: return 'Yolcu';
  }
};

// Uçuş servisi HTML oluştur
const buildFlightHtml = (flightInfo: FlightInfo, pnrNo: string, isOutbound: boolean): string => {
  const segments = flightInfo.segments || [];
  const title = isOutbound ? 'Gidiş Uçuşu' : 'Dönüş Uçuşu';
  const stopText = flightInfo.stopCount > 0 ? `${flightInfo.stopCount} Aktarma` : 'Direkt';

  let segmentsHtml = '';
  segments.forEach((segment, index) => {
    const isLayover = index > 0;
    if (isLayover) {
      segmentsHtml += `
        <tr>
          <td colspan="2" style="padding: 8px 16px; background-color: #fff3cd; text-align: center; font-size: 12px; color: #856404;">
            ✈️ Aktarma: ${segment.departure.city.name} (${segment.departure.airport.code})
          </td>
        </tr>`;
    }
    segmentsHtml += `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e9ecef;">
          <div style="font-weight: 600; color: #333;">${segment.airline.code} ${segment.flightNo}</div>
          <div style="font-size: 12px; color: #666;">${segment.airline.name}</div>
          <div style="font-size: 11px; color: #999; margin-top: 4px;">${segment.flightClass.name}</div>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e9ecef;">
          <div style="display: flex; justify-content: space-between;">
            <div>
              <div style="font-weight: 600; font-size: 18px; color: #333;">${formatTime(segment.departure.date)}</div>
              <div style="font-size: 12px; color: #666;">${segment.departure.city.name}</div>
              <div style="font-size: 11px; color: #999;">${segment.departure.airport.code}</div>
            </div>
            <div style="text-align: center; padding: 0 16px;">
              <div style="font-size: 11px; color: #999;">${formatDuration(segment.duration)}</div>
              <div style="border-top: 1px dashed #ccc; margin: 4px 0; width: 60px;"></div>
              <div style="font-size: 10px; color: #999;">→</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 600; font-size: 18px; color: #333;">${formatTime(segment.arrival.date)}</div>
              <div style="font-size: 12px; color: #666;">${segment.arrival.city.name}</div>
              <div style="font-size: 11px; color: #999;">${segment.arrival.airport.code}</div>
            </div>
          </div>
        </td>
      </tr>`;
  });

  return `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e9ecef; border-radius: 8px; overflow: hidden;">
      <tr style="background-color: ${isOutbound ? '#0d6efd' : '#198754'}; color: white;">
        <td style="padding: 12px 16px; font-weight: 600;">${title}</td>
        <td style="padding: 12px 16px; text-align: right;">
          <span style="background-color: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px; font-size: 12px;">PNR: ${pnrNo}</span>
          <span style="margin-left: 8px; font-size: 12px;">${stopText}</span>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 12px 16px; background-color: #f8f9fa; font-size: 13px; color: #666;">
          📅 ${formatDate(flightInfo.departure.date)}
        </td>
      </tr>
      ${segmentsHtml}
    </table>`;
};

// Ana template fonksiyonu
export const buildBookingConfirmationEmail = (reservationDetails: any): { html: string; subject: string; toEmail: string | null } => {
  const reservationData: ReservationData = reservationDetails?.body?.reservationData;
  
  if (!reservationData) {
    return { html: '', subject: '', toEmail: null };
  }

  const { reservationInfo, services, travellers } = reservationData;
  
  // Leader yolcuyu bul
  const leader = travellers?.find(t => t.isLeader);
  const toEmail = leader?.address?.email || null;

  // Uçuş servislerini ayır (productType: 3 ve isExtraService: false)
  const flightServices = services?.filter(s => s.productType === 3 && !s.isExtraService) || [];
  
  // Gidiş ve dönüş uçuşlarını grupla (route: 1 = gidiş, route: 2 = dönüş)
  const outboundFlights = flightServices.filter(s => s.serviceDetails?.flightInfo?.route === 1);
  const returnFlights = flightServices.filter(s => s.serviceDetails?.flightInfo?.route === 2);

  // İlk gidiş ve dönüş uçuşunu al (her yolcu için ayrı service var, ilkini al)
  const outboundFlight = outboundFlights[0];
  const returnFlight = returnFlights[0];

  // PNR numaraları
  const outboundPnr = outboundFlight?.pnrNo || reservationInfo?.bookingNumber || '-';
  const returnPnr = returnFlight?.pnrNo || outboundPnr;

  // Yolcu listesi HTML
  const passengersHtml = travellers?.map(t => `
    <tr>
      <td style="padding: 8px 16px; border-bottom: 1px solid #e9ecef;">
        ${t.name} ${t.surname}
        ${t.isLeader ? '<span style="background-color: #ffc107; color: #000; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">Lider</span>' : ''}
      </td>
      <td style="padding: 8px 16px; border-bottom: 1px solid #e9ecef; text-align: right;">
        ${getPassengerTypeLabel(t.type)}
      </td>
    </tr>
  `).join('') || '';

  // Email HTML
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rezervasyon Onayı</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">✈️ Rezervasyonunuz Onaylandı!</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Bilet bilgileriniz aşağıdadır</p>
      </td>
    </tr>
    
    <!-- PNR Info -->
    <tr>
      <td style="padding: 24px;">
        <table style="width: 100%; background-color: #e8f4fd; border-radius: 8px; padding: 16px;">
          <tr>
            <td style="text-align: center;">
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">PNR No:</div>
              <div style="font-size: 28px; font-weight: bold; color: #0d6efd; letter-spacing: 2px;">${outboundPnr}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Flights -->
    <tr>
      <td style="padding: 0 24px;">
        ${outboundFlight?.serviceDetails?.flightInfo ? buildFlightHtml(outboundFlight.serviceDetails.flightInfo, outboundPnr, true) : ''}
        ${returnFlight?.serviceDetails?.flightInfo ? buildFlightHtml(returnFlight.serviceDetails.flightInfo, returnPnr, false) : ''}
      </td>
    </tr>

    <!-- Passengers -->
    <tr>
      <td style="padding: 0 24px 24px 24px;">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e9ecef; border-radius: 8px; overflow: hidden;">
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 12px 16px; font-weight: 600; color: #333;">👥 Yolcular</td>
            <td style="padding: 12px 16px; text-align: right; font-size: 12px; color: #666;">${travellers?.length || 0} Yolcu</td>
          </tr>
          ${passengersHtml}
        </table>
      </td>
    </tr>

    <!-- Total Price -->
    <tr>
      <td style="padding: 0 24px 24px 24px;">
        <table style="width: 100%; background-color: #f8f9fa; border-radius: 8px;">
          <tr>
            <td style="padding: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 14px; color: #666;">Toplam Tutar</span>
                <span style="font-size: 24px; font-weight: bold; color: #198754;">${formatPrice(reservationInfo?.totalPrice?.amount || 0, reservationInfo?.totalPrice?.currency || 'TRY')}</span>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #e9ecef;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">
          Bu email ${leader?.name} ${leader?.surname} adına gönderilmiştir.
        </p>
        <p style="margin: 0; font-size: 11px; color: #999;">
          © ${new Date().getFullYear()} İbilet - Tüm hakları saklıdır.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const subject = `İbilet - Rezervasyon Onayı (${reservationInfo?.bookingNumber || 'PNR'})`;

  return { html, subject, toEmail };
};

