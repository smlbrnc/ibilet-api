/**
 * Otel rezervasyonu email template'i
 * iBilet marka tasarımı ile otel bilgileri, misafir listesi ve fiyat bilgilerini içerir
 */

// ============================================================================
// INTERFACES
// ============================================================================

interface HotelDetail {
  id: string;
  name: string;
  stars: number;
  address?: { addressLines?: string[] };
  city?: { name: string };
  country?: { name: string };
  phoneNumber?: string;
  geolocation?: { latitude: string; longitude: string };
}

interface ServiceDetails {
  room?: string;
  roomCode?: string;
  board?: string;
  boardCode?: string;
  night?: number;
  star?: string;
  accom?: string;
  hotelDetail?: HotelDetail;
  geoLocation?: { latitude: string; longitude: string };
}

interface Service {
  name: string;
  productType: number;
  isExtraService: boolean;
  beginDate: string;
  endDate: string;
  supplierBookingNumber?: string;
  serviceDetails?: ServiceDetails;
  arrivalCity?: { name: string };
  arrivalCountry?: { name: string };
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
  totalPrice: { amount: number; currency: string };
  departureCity?: { name: string };
  arrivalCity?: { name: string };
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

// formatDateFull removed - unused function

/** Kısa tarih formatı: "30 Kas 2025" */
const formatDateShort = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Fiyat formatı: "21.121,67 TRY" */
const formatPrice = (amount: number, currency: string): string => {
  return (
    new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      amount,
    ) +
    ' ' +
    (currency || 'TRY')
  );
};

/** Yıldız HTML'i oluşturur: "★★★★★" */
const buildStarsHtml = (stars: number): string => {
  const fullStars = Math.min(Math.max(Math.floor(stars), 0), 5);
  return '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
};

/** Misafir tipi metni */
const getGuestTypeText = (type: number): string => {
  switch (type) {
    case 1:
      return 'Yetişkin';
    case 2:
      return 'Çocuk';
    case 3:
      return 'Bebek';
    default:
      return 'Misafir';
  }
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
    .gold { color:#f59e0b; }

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

export const buildHotelBookingEmail = (
  reservationDetails: any,
): { html: string; subject: string; toEmail: string | null } => {
  const reservationData: ReservationData = reservationDetails?.body?.reservationData;

  if (!reservationData) {
    return { html: '', subject: '', toEmail: null };
  }

  const { reservationInfo, services, travellers } = reservationData;

  // Leader misafiri bul
  const leader = travellers?.find((t) => t.isLeader);
  const toEmail = leader?.address?.email || null;

  // Otel servisini bul (productType: 2 ve isExtraService: false)
  const hotelService = services?.find((s) => s.productType === 2 && !s.isExtraService);

  if (!hotelService) {
    return { html: '', subject: '', toEmail: null };
  }

  const hotelDetail = hotelService.serviceDetails?.hotelDetail;
  const hotelName = hotelDetail?.name || hotelService.name || '-';
  const hotelStars = hotelDetail?.stars || parseInt(hotelService.serviceDetails?.star || '0') || 0;
  const hotelAddress = hotelDetail?.address?.addressLines?.[0] || '-';
  const hotelPhone = hotelDetail?.phoneNumber || '-';
  const hotelCity = hotelDetail?.city?.name || hotelService.arrivalCity?.name || '-';
  const hotelCountry = hotelDetail?.country?.name || hotelService.arrivalCountry?.name || '-';

  // Oda ve pansiyon bilgileri
  const roomType = hotelService.serviceDetails?.room || '-';
  const boardType = hotelService.serviceDetails?.board || '-';
  const nightCount = hotelService.serviceDetails?.night || 0;

  // Voucher numarası
  const voucherNo = hotelService.supplierBookingNumber || reservationInfo?.bookingNumber || '-';

  // Check-in / Check-out
  const checkInDate = hotelService.beginDate || reservationInfo?.beginDate;
  const checkOutDate = hotelService.endDate || reservationInfo?.endDate;

  // Misafir sayısı
  const guestCount = travellers?.length || 0;

  // Toplam tutar
  const totalAmount = reservationInfo?.totalPrice?.amount || 0;
  const currency = reservationInfo?.totalPrice?.currency || 'TRY';

  // Misafir listesi HTML
  const guestListHtml =
    travellers
      ?.map(
        (t) => `
                <tr style="background:#ffffff;">
                  <td class="base" style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${t.name} ${t.surname}${t.isLeader ? ' <span style="color:#f26f6d;font-size:11px;">(Lider)</span>' : ''}</td>
                  <td class="base hide-sm" style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${getGuestTypeText(t.type)}</td>
                </tr>`,
      )
      .join('') || '';

  // Email HTML
  const html = `<!DOCTYPE html>
<html lang="tr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Otel Rezervasyon Onayı · iBilet</title>
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div style="display:none;max-height:0;overflow:hidden;">Voucher ${voucherNo} için otel rezervasyonunuz onaylandı · ${hotelName}</div>

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
                    <div class="xs">Voucher No</div>
                    <div class="lg accent">${voucherNo}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td class="px py muted" align="center">
              <div class="xxl" style="margin-bottom:4px;">Otel Rezervasyonunuz Onaylandı</div>
              <div class="sm">Detaylar ve konaklama bilgileri aşağıda.</div>
            </td>
          </tr>

          <!-- Hotel Card -->
          <tr>
            <td class="px py">
              <table width="100%">
                <tr>
                  <td class="lg">${hotelName}</td>
                  <td align="right"><span class="gold" style="font-size:16px;">${buildStarsHtml(hotelStars)}</span></td>
                </tr>
              </table>

              <table width="100%" class="border" style="margin-top:12px;">
                <tr>
                  <td class="px py">
                    <table width="100%">
                      <tr>
                        <td width="50%" align="left">
                          <div class="sm" style="color:#64748b;">Check-in</div>
                          <div class="lg">${formatDateShort(checkInDate)}</div>
                          <div class="xs" style="color:#64748b;margin-top:4px;">14:00'dan itibaren</div>
                        </td>
                        <td width="50%" align="right">
                          <div class="sm" style="color:#64748b;">Check-out</div>
                          <div class="lg">${formatDateShort(checkOutDate)}</div>
                          <div class="xs" style="color:#64748b;margin-top:4px;">12:00'ye kadar</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Hotel Info -->
              <table width="100%" style="margin-top:12px;">
                <tr>
                  <td class="sm" style="padding:8px 0;">
                    <strong>Adres:</strong> ${hotelAddress}
                  </td>
                </tr>
                <tr>
                  <td class="sm" style="padding:8px 0;">
                    <strong>Konum:</strong> ${hotelCity}, ${hotelCountry}
                  </td>
                </tr>
                <tr>
                  <td class="sm" style="padding:8px 0;">
                    <strong>Telefon:</strong> ${hotelPhone}
                  </td>
                </tr>
              </table>

              <!-- Room & Board -->
              <table width="100%" style="margin-top:12px;">
                <tr>
                  <td><span class="pill">🛏️ ${roomType}</span></td>
                  <td><span class="pill">🍽️ ${boardType}</span></td>
                  <td align="right"><span class="pill">🌙 ${nightCount} Gece</span></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Guest List -->
          <tr>
            <td class="px">
              <div class="lg" style="margin-bottom:8px;">Misafir Bilgileri</div>
              <table width="100%">
                <tr style="background:#f9fafb;">
                  <td class="xs" style="padding:10px 12px;font-weight:600;">Ad Soyad</td>
                  <td class="xs hide-sm" style="padding:10px 12px;font-weight:600;">Misafir Tipi</td>
                </tr>
${guestListHtml}
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
                        <td class="sm" style="padding:6px 0;">Konaklama (${nightCount} Gece, ${guestCount} Misafir)</td>
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
                    • Check-in saati 14:00, check-out saati 12:00'dir.<br>
                    • Erken giriş ve geç çıkış otelin müsaitliğine bağlıdır.<br>
                    • Kimlik belgenizi ve bu voucher'ı yanınızda bulundurun.<br>
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

  const subject = `İbilet - Otel Rezervasyon Onayı (Voucher: ${voucherNo})`;

  return { html, subject, toEmail };
};
