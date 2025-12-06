/**
 * Otel rezervasyonu PDF template'i
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

import {
  ReservationData,
  formatDateShort,
  formatPrice,
  getTravellerTypeText,
  FONTS,
} from './common';

interface HotelInfo {
  name: string;
  address?: string;
  city?: { name: string };
  checkIn: string;
  checkOut: string;
  roomType?: string;
  boardType?: string;
}

interface HotelService {
  pnrNo: string;
  productType: number;
  isExtraService: boolean;
  serviceDetails?: { hotelInfo?: HotelInfo };
}

/**
 * Otel rezervasyonu PDF'i oluştur
 */
export const buildHotelBookingPdf = (reservationDetails: any): InstanceType<typeof PDFDocument> => {
  const reservationData: ReservationData = reservationDetails?.body?.reservationData;

  if (!reservationData) {
    throw new Error('Rezervasyon verisi bulunamadı');
  }

  const { reservationInfo, services, travellers } = reservationData;

  // Otel servisini bul
  const hotelService = services?.find(
    (s: HotelService) => s.productType === 2 && !s.isExtraService,
  ) as HotelService | undefined;
  const hotelInfo = hotelService?.serviceDetails?.hotelInfo;
  const voucherNo = hotelService?.pnrNo || reservationInfo?.bookingNumber || '-';

  // PDF oluştur
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  // Roboto fontlarını kaydet (Türkçe karakter desteği)
  doc.registerFont('Roboto', FONTS.regular);
  doc.registerFont('Roboto-Bold', FONTS.bold);

  // Başlık
  doc.fontSize(24).font('Roboto-Bold').text('iBilet', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(18).font('Roboto').text('Otel Rezervasyon Onayı', { align: 'center' });
  doc.moveDown(1);

  // Rezervasyon Bilgileri
  doc.fontSize(14).font('Roboto-Bold').text('Rezervasyon Bilgileri');
  doc.moveDown(0.3);
  doc.fontSize(12).font('Roboto');
  doc.text(`Rezervasyon No: ${reservationInfo?.bookingNumber || '-'}`);
  doc.text(`Voucher No: ${voucherNo}`);
  doc.moveDown(0.5);

  // Otel Bilgileri
  if (hotelInfo) {
    doc.fontSize(14).font('Roboto-Bold').text('Otel Bilgileri');
    doc.moveDown(0.3);
    doc.fontSize(12).font('Roboto');
    doc.text(`Otel: ${hotelInfo.name || '-'}`);
    if (hotelInfo.address) doc.text(`Adres: ${hotelInfo.address}`);
    if (hotelInfo.city?.name) doc.text(`Şehir: ${hotelInfo.city.name}`);
    doc.text(`Giriş: ${formatDateShort(hotelInfo.checkIn)}`);
    doc.text(`Çıkış: ${formatDateShort(hotelInfo.checkOut)}`);
    if (hotelInfo.roomType) doc.text(`Oda Tipi: ${hotelInfo.roomType}`);
    if (hotelInfo.boardType) doc.text(`Pansiyon Tipi: ${hotelInfo.boardType}`);
    doc.moveDown(0.5);
  }

  // Yolcu Bilgileri
  if (travellers?.length > 0) {
    doc.fontSize(14).font('Roboto-Bold').text('Misafir Bilgileri');
    doc.moveDown(0.3);
    doc.fontSize(12).font('Roboto');
    travellers.forEach((t, i) => {
      doc.text(`${i + 1}. ${t.name} ${t.surname} (${getTravellerTypeText(t.type)})`);
      if (t.isLeader && t.address?.email) {
        doc.text(`   Email: ${t.address.email}`);
      }
    });
    doc.moveDown(0.5);
  }

  // Fiyat Bilgisi
  doc.fontSize(14).font('Roboto-Bold').text('Fiyat Bilgisi');
  doc.moveDown(0.3);
  doc
    .fontSize(16)
    .font('Roboto-Bold')
    .text(
      `Toplam: ${formatPrice(reservationInfo?.totalPrice?.amount, reservationInfo?.totalPrice?.currency)}`,
    );

  // Alt bilgi
  doc.moveDown(2);
  doc.fontSize(10).font('Roboto').fillColor('gray');
  doc.text('Bu belge elektronik ortamda oluşturulmuştur.', { align: 'center' });
  doc.text(`Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}`, { align: 'center' });

  return doc;
};
