/**
 * Uçuş rezervasyonu PDF template'i
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

import { ReservationData, formatDateShort, formatTime, formatDuration, formatPrice, getTravellerTypeText } from './common';

interface FlightInfo {
  route: number;
  flightNo: string;
  duration: number;
  stopCount: number;
  airline: { code: string; name: string };
  departure: { city: { name: string }; airport: { code: string; name: string }; date: string };
  arrival: { city: { name: string }; airport: { code: string; name: string }; date: string };
  flightClass: { name: string };
}

interface FlightService {
  pnrNo: string;
  productType: number;
  isExtraService: boolean;
  serviceDetails?: { flightInfo?: FlightInfo };
}

/**
 * Uçuş rezervasyonu PDF'i oluştur
 */
export const buildFlightBookingPdf = (reservationDetails: any): InstanceType<typeof PDFDocument> => {
  const reservationData: ReservationData = reservationDetails?.body?.reservationData;

  if (!reservationData) {
    throw new Error('Rezervasyon verisi bulunamadı');
  }

  const { reservationInfo, services, travellers } = reservationData;

  // Uçuş servislerini ayır
  const flightServices = (services?.filter((s: FlightService) => s.productType === 3 && !s.isExtraService) || []) as FlightService[];
  const outboundFlight = flightServices.find((s) => s.serviceDetails?.flightInfo?.route === 1);
  const returnFlight = flightServices.find((s) => s.serviceDetails?.flightInfo?.route === 2);

  // PNR ve rota
  const pnr = reservationInfo?.agencyReservationNumber || outboundFlight?.pnrNo || reservationInfo?.bookingNumber || '-';
  const route = `${reservationInfo?.departureCity?.name || '-'} → ${reservationInfo?.arrivalCity?.name || '-'}`;

  // PDF oluştur
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  // Başlık
  doc.fontSize(24).font('Helvetica-Bold').text('iBilet', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(18).font('Helvetica').text('Rezervasyon Onayı', { align: 'center' });
  doc.moveDown(1);

  // Rezervasyon Bilgileri
  doc.fontSize(14).font('Helvetica-Bold').text('Rezervasyon Bilgileri');
  doc.moveDown(0.3);
  doc.fontSize(12).font('Helvetica');
  doc.text(`Rezervasyon No: ${reservationInfo?.bookingNumber || '-'}`);
  doc.text(`PNR: ${pnr}`);
  doc.text(`Rota: ${route}`);
  doc.moveDown(0.5);

  // Uçuş bilgilerini render et
  const renderFlight = (flight: FlightService | undefined, title: string) => {
    if (!flight?.serviceDetails?.flightInfo) return;
    const info = flight.serviceDetails.flightInfo;

    doc.fontSize(14).font('Helvetica-Bold').text(title);
    doc.moveDown(0.3);
    doc.fontSize(12).font('Helvetica');
    doc.text(`Havayolu: ${info.airline?.name || '-'}`);
    doc.text(`Uçuş No: ${info.flightNo || '-'}`);
    doc.text(`Kalkış: ${info.departure?.airport?.name || '-'} (${info.departure?.airport?.code || '-'})`);
    doc.text(`Tarih: ${formatDateShort(info.departure?.date)} ${formatTime(info.departure?.date)}`);
    doc.text(`Varış: ${info.arrival?.airport?.name || '-'} (${info.arrival?.airport?.code || '-'})`);
    doc.text(`Tarih: ${formatDateShort(info.arrival?.date)} ${formatTime(info.arrival?.date)}`);
    doc.text(`Süre: ${formatDuration(info.duration)}`);
    doc.text(`Sınıf: ${info.flightClass?.name || '-'}`);
    doc.moveDown(0.5);
  };

  renderFlight(outboundFlight, 'Gidiş Uçuşu');
  renderFlight(returnFlight, 'Dönüş Uçuşu');

  // Yolcu Bilgileri
  if (travellers?.length > 0) {
    doc.fontSize(14).font('Helvetica-Bold').text('Yolcu Bilgileri');
    doc.moveDown(0.3);
    doc.fontSize(12).font('Helvetica');
    travellers.forEach((t, i) => {
      doc.text(`${i + 1}. ${t.name} ${t.surname} (${getTravellerTypeText(t.type)})`);
      if (t.isLeader && t.address?.email) {
        doc.text(`   Email: ${t.address.email}`);
      }
    });
    doc.moveDown(0.5);
  }

  // Fiyat Bilgisi
  doc.fontSize(14).font('Helvetica-Bold').text('Fiyat Bilgisi');
  doc.moveDown(0.3);
  doc.fontSize(16).font('Helvetica-Bold').text(`Toplam: ${formatPrice(reservationInfo?.totalPrice?.amount, reservationInfo?.totalPrice?.currency)}`);

  // Alt bilgi
  doc.moveDown(2);
  doc.fontSize(10).font('Helvetica').fillColor('gray');
  doc.text('Bu belge elektronik ortamda oluşturulmuştur.', { align: 'center' });
  doc.text(`Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}`, { align: 'center' });

  return doc;
};
