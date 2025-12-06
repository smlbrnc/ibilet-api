/**
 * Uçuş rezervasyonu email template'i
 * iBilet marka tasarımı ile uçuş bilgileri, yolcu listesi ve fiyat bilgilerini içerir
 */

// ============================================================================
// INTERFACES
// ============================================================================

interface BaggageInfo {
  piece: number;
  weight: number;
  unitType: number;
  baggageType: number; // 1 = Checked, 2 = Cabin
  passengerType: number;
}

interface Segment {
  flightNo: string;
  duration: number;
  airline: { code: string; name: string; logoFull?: string };
  departure: { city: { name: string }; airport: { code: string; name: string }; date: string };
  arrival: { city: { name: string }; airport: { code: string; name: string }; date: string };
  flightClass: { name: string };
  baggageInformations?: BaggageInfo[];
}

interface FlightInfo {
  route: number; // 1 = Gidiş, 2 = Dönüş
  flightNo: string;
  duration: number;
  stopCount: number;
  airline: { code: string; name: string; logoFull?: string };
  departure: { city: { name: string }; airport: { code: string; name: string }; date: string };
  arrival: { city: { name: string }; airport: { code: string; name: string }; date: string };
  flightClass: { name: string };
  segments: Segment[];
  baggageInformations?: BaggageInfo[];
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
  birthDate?: string;
  address?: { email?: string };
}

interface ReservationInfo {
  bookingNumber: string;
  agencyReservationNumber?: string;
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Kısa tarih formatı: "30 Kas 2025" */
const formatDateShort = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Saat formatı: "09:00" */
const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
};

/** Süre formatı: "1s 10dk" */
const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}s ${mins}dk`;
  if (hours > 0) return `${hours}s`;
  return `${mins}dk`;
};

/** Fiyat formatı: "8.222,52 TRY" */
const formatPrice = (amount: number, currency: string): string => {
  return (
    new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      amount,
    ) +
    ' ' +
    (currency || 'TRY')
  );
};

/** Yolcu tipi metni */
const getPassengerTypeText = (type: number): string => {
  switch (type) {
    case 1:
      return 'Yetişkin';
    case 2:
      return 'Çocuk';
    case 3:
      return 'Bebek';
    default:
      return 'Yolcu';
  }
};

/** Bagaj bilgisi: "25 kg" */
const getBaggageAllowance = (baggageInfos?: BaggageInfo[]): string => {
  if (!baggageInfos || baggageInfos.length === 0) return '-';
  const checkedBaggage = baggageInfos.find((b) => b.baggageType === 1);
  if (checkedBaggage) return `${checkedBaggage.weight} kg`;
  return '-';
};

/** Doğum tarihi formatı: "22.11.1981" */
const formatBirthDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR');
};

// ============================================================================
// HTML BUILDERS
// ============================================================================

/** Uçuş kartı HTML'i oluşturur */
const buildFlightCard = (flight: FlightInfo, pnr: string, isOutbound: boolean): string => {
  const routeLabel = isOutbound ? 'Gidiş' : 'Dönüş';
  const baggageWeight = getBaggageAllowance(
    flight.baggageInformations || flight.segments?.[0]?.baggageInformations,
  );
  const flightClassName =
    flight.flightClass?.name || flight.segments?.[0]?.flightClass?.name || 'Economy';

  return `
          <!-- Flight Card: ${routeLabel} -->
          <tr>
            <td class="px py">
              <table width="100%">
                <tr>
                  <td class="lg">${flight.airline.name} · ${flight.flightNo}</td>
                  <td align="right"><span class="pill">PNR No: ${pnr}</span></td>
                </tr>
              </table>

              <table width="100%" class="border" style="margin-top:12px;">
                <tr>
                  <td class="px py">
                    <table width="100%">
                      <tr>
                        <td width="33%" align="left">
                          <div class="sm" style="color:#64748b;">Kalkış</div>
                          <div class="lg">${flight.departure.airport.code}</div>
                          <div class="sm">${flight.departure.city.name}</div>
                          <div class="sm accent" style="margin-top:4px;font-weight:600;">${formatDateShort(flight.departure.date)} · ${formatTime(flight.departure.date)}</div>
                        </td>
                        <td width="33%" align="center">
                          <div class="xs" style="color:#64748b;">Uçuş tipi</div>
                          <div class="lg">${routeLabel}</div>
                          <div class="xs" style="color:#64748b;margin-top:4px;">${formatDuration(flight.duration)}</div>
                        </td>
                        <td width="33%" align="right">
                          <div class="sm" style="color:#64748b;">Varış</div>
                          <div class="lg">${flight.arrival.airport.code}</div>
                          <div class="sm">${flight.arrival.city.name}</div>
                          <div class="sm accent" style="margin-top:4px;font-weight:600;">${formatDateShort(flight.arrival.date)} · ${formatTime(flight.arrival.date)}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- meta -->
              <table width="100%" style="margin-top:12px;">
                <tr>
                  <td><span class="pill">Sınıf: ${flightClassName}</span></td>
                  <td><span class="pill">Bagaj: ${baggageWeight}</span></td>
                  <td align="right"><span class="pill">Durum: Onaylandı</span></td>
                </tr>
              </table>
            </td>
          </tr>`;
};

/** Yolcu satırı HTML'i oluşturur */
const buildPassengerRow = (traveller: Traveller): string => {
  return `
                <tr style="background:#ffffff;">
                  <td class="base" style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${traveller.name} ${traveller.surname}${traveller.isLeader ? ' <span style="color:#f26f6d;font-size:11px;">(Lider)</span>' : ''}</td>
                  <td class="base hide-sm" style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${formatBirthDate(traveller.birthDate)}</td>
                  <td class="base hide-sm" style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${getPassengerTypeText(traveller.type)}</td>
                </tr>`;
};

// ============================================================================
// EMAIL STYLES
// ============================================================================

const EMAIL_STYLES = `
    /* RESET */
    * { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; border-collapse:collapse; }
    img { -ms-interpolation-mode:bicubic; border:0; outline:0; text-decoration:none; display:block; }
    .ExternalClass { width:100%; } .ExternalClass * { line-height:100%; }
    a { text-decoration:none; }

    /* SYSTEM FONT STACK */
    body, table, td, div, span, a {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    }

    /* LAYOUT */
    body { margin:0; padding:0; width:100%!important; background:#f7f8fa; color:#0f172a; }
    .wrap { width:100%; max-width:680px; background:#ffffff; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden; }
    .px { padding-left:24px; padding-right:24px; }
    .py { padding-top:24px; padding-bottom:24px; }
    .muted { background:#f9fafb; }
    .border { border:1px solid #e5e7eb; border-radius:10px; }
    .hr { height:1px; background:#e5e7eb; }

    /* TYPE */
    .xs { font-size:12px; line-height:18px; color:#64748b; }
    .sm { font-size:13px; line-height:20px; color:#64748b; }
    .base { font-size:14px; line-height:22px; color:#0f172a; }
    .lg { font-size:16px; line-height:24px; font-weight:600; color:#0f172a; }
    .xl { font-size:20px; line-height:28px; font-weight:700; color:#111827; }
    .xxl { font-size:24px; line-height:32px; font-weight:700; color:#111827; }

    /* COLORS */
    .primary { color:#f26f6d; }
    .accent { color:#525267; }

    /* CHIPS */
    .pill { display:inline-block; padding:6px 10px; border:1px solid #e5e7eb; border-radius:7px; font-weight:500; font-size:13px; color:#64748b; }

    /* RESPONSIVE */
    @media only screen and (max-width:640px){
      .wrap { border-radius:0; border-left:0; border-right:0; }
      .stack { display:block !important; width:100% !important; }
      .center { text-align:center !important; }
      .hide-sm { display:none !important; }
      .px { padding-left:16px; padding-right:16px; }
      .py { padding-top:18px; padding-bottom:18px; }
    }`;

// ============================================================================
// MAIN TEMPLATE FUNCTION
// ============================================================================

export const buildFlightBookingEmail = (
  reservationDetails: any,
): { html: string; subject: string; toEmail: string | null } => {
  const reservationData: ReservationData = reservationDetails?.body?.reservationData;

  if (!reservationData) {
    return { html: '', subject: '', toEmail: null };
  }

  const { reservationInfo, services, travellers } = reservationData;

  // Leader yolcuyu bul
  const leader = travellers?.find((t) => t.isLeader);
  const toEmail = leader?.address?.email || null;

  // Uçuş servislerini ayır (productType: 3 ve isExtraService: false)
  const flightServices = services?.filter((s) => s.productType === 3 && !s.isExtraService) || [];

  // Gidiş ve dönüş uçuşlarını grupla (route: 1 = gidiş, route: 2 = dönüş)
  const outboundFlights = flightServices.filter((s) => s.serviceDetails?.flightInfo?.route === 1);
  const returnFlights = flightServices.filter((s) => s.serviceDetails?.flightInfo?.route === 2);

  // İlk gidiş ve dönüş uçuşunu al
  const outboundFlight = outboundFlights[0];
  const returnFlight = returnFlights[0];

  // PNR numarası
  const pnr =
    reservationInfo?.agencyReservationNumber ||
    outboundFlight?.pnrNo ||
    reservationInfo?.bookingNumber ||
    '-';

  // Rota bilgisi
  const route = `${reservationInfo?.departureCity?.name || '-'} → ${reservationInfo?.arrivalCity?.name || '-'}`;

  // Yolcu sayısı
  const passengerCount = travellers?.length || 0;

  // Toplam tutar
  const totalAmount = reservationInfo?.totalPrice?.amount || 0;
  const currency = reservationInfo?.totalPrice?.currency || 'TRY';

  // Uçuş kartları HTML
  let flightCardsHtml = '';
  if (outboundFlight?.serviceDetails?.flightInfo) {
    flightCardsHtml += buildFlightCard(outboundFlight.serviceDetails.flightInfo, pnr, true);
  }
  if (returnFlight?.serviceDetails?.flightInfo) {
    flightCardsHtml += buildFlightCard(returnFlight.serviceDetails.flightInfo, pnr, false);
  }

  // Yolcu listesi HTML
  const passengerListHtml = travellers?.map((t) => buildPassengerRow(t)).join('') || '';

  // Email HTML
  const html = `<!DOCTYPE html>
<html lang="tr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Uçuş Rezervasyon Onayı · iBilet</title>
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div style="display:none;max-height:0;overflow:hidden;">PNR ${pnr} için rezervasyonunuz onaylandı · ${route}</div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7f8fa;">
    <tr>
      <td align="center" class="px py">

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="wrap">
          <!-- Header -->
          <tr>
            <td class="px py">
              <table width="100%">
                <tr>
                  <td class="stack">
                    <img src="https://ibilet.com/logo/logo2.png" alt="iBilet" style="height:36px;max-width:130px;">
                    <div class="xs" style="margin-top:6px;">Kanatlanın, keşfedin!</div>
                  </td>
                  <td class="stack" align="right">
                    <div class="xs">PNR No</div>
                    <div class="lg accent">${pnr}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td class="px py muted" align="center">
              <div class="xxl" style="margin-bottom:4px;">Uçuş Rezervasyonunuz Onaylandı</div>
              <div class="sm">Detaylar ve bilet özeti aşağıda.</div>
            </td>
          </tr>

          <!-- Flight Cards -->
${flightCardsHtml}

          <!-- Passenger List -->
          <tr>
            <td class="px">
              <div class="lg" style="margin-bottom:8px;">Yolcu Bilgileri</div>
              <table width="100%">
                <tr style="background:#f9fafb;">
                  <td class="xs" style="padding:10px 12px;font-weight:600;">Ad Soyad</td>
                  <td class="xs hide-sm" style="padding:10px 12px;font-weight:600;">Doğum Tarihi</td>
                  <td class="xs hide-sm" style="padding:10px 12px;font-weight:600;">Yolcu Tipi</td>
                </tr>
${passengerListHtml}
              </table>
            </td>
          </tr>

          <!-- Payment -->
          <tr>
            <td class="px py">
              <table width="100%" style="padding:14px;">
                <tr><td class="lg" style="padding-bottom:6px;">Ödeme Özeti</td></tr>
                <tr>
                  <td>
                    <table width="100%">
                      <tr>
                        <td class="sm" style="padding:6px 0;">Bilet Ücreti (${passengerCount} Yolcu)</td>
                        <td class="sm" style="padding:6px 0;" align="right"><strong>${formatPrice(totalAmount, currency)}</strong></td>
                      </tr>
                      <tr><td colspan="2"><div class="hr"></div></td></tr>
                      <tr>
                        <td class="sm" style="padding-top:6px;">Toplam Tutar</td>
                        <td class="sm primary" style="padding-top:6px;" align="right"><strong>${formatPrice(totalAmount, currency)}</strong></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Important Info -->
          <tr>
            <td class="px py">
              <table width="100%" style="padding:14px;">
                <tr><td class="lg" style="padding-bottom:6px;">Önemli Bilgiler</td></tr>
                <tr>
                  <td class="sm">
                    • Uçuştan en az 2 saat önce havaalanında olun.<br>
                    • Kimlik belgeniz ve biletinizi yanınızda bulundurun.<br>
                    • Online check-in uçuşunuzdan 24 saat önce açılır.<br>
                    • Değişiklik/iptal için müşteri hizmetleriyle iletişime geçin.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="px py muted">
              <table width="100%">
                <tr>
                  <td class="stack">
                    <img src="https://ibilet.com/logo/logo2.png" alt="iBilet" style="height:28px;max-width:100px;margin-bottom:6px;">
                    <div class="xs">IBGroup · GOlife Turizm</div>
                  </td>
                  <td class="stack" align="right">
                    <a class="xs primary" href="https://ibilet.com" style="margin-right:6px;">Ana Sayfa</a>
                    <a class="xs primary" href="https://ibilet.com/help" style="margin-right:6px;">Yardım</a>
                    <a class="xs primary" href="https://ibilet.com/contact">İletişim</a><br>
                    <div class="xs" style="margin-top:6px;">© ${new Date().getFullYear()} iBilet.com · Tüm hakları saklıdır.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const subject = `İbilet - Uçuş Rezervasyon Onayı (PNR: ${pnr})`;

  return { html, subject, toEmail };
};
