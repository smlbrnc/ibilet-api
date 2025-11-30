import { Controller, Get, Param, Res, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { PdfService } from './pdf.service';

@ApiTags('PDF')
@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Get('reservation/:reservationNumber')
  @ApiOperation({ summary: 'Rezervasyon PDF İndir' })
  @ApiParam({ name: 'reservationNumber', description: 'Rezervasyon numarası', example: 'PX041346' })
  @ApiResponse({ status: 200, description: 'PDF döndürüldü' })
  @ApiResponse({ status: 404, description: 'Rezervasyon bulunamadı' })
  async getPdfByReservationNumber(@Param('reservationNumber') reservationNumber: string, @Res() res: Response) {
    try {
      const { buffer } = await this.pdfService.generatePdfFromReservationNumber(reservationNumber);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="booking-${reservationNumber}.pdf"`);
      res.send(buffer);
    } catch (error) {
      this.handleError(error, 'Rezervasyon');
    }
  }

  @Get('booking/:bookingId')
  @ApiOperation({ summary: 'Booking ID ile PDF İndir' })
  @ApiParam({ name: 'bookingId', description: 'Booking UUID', example: '139428d8-f639-43c1-937f-681d8e81041f' })
  @ApiResponse({ status: 200, description: 'PDF döndürüldü' })
  @ApiResponse({ status: 404, description: 'Booking bulunamadı' })
  async getPdfByBookingId(@Param('bookingId') bookingId: string, @Res() res: Response) {
    try {
      // UUID formatı kontrolü
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) {
        throw new HttpException('Geçersiz booking ID formatı', HttpStatus.BAD_REQUEST);
      }

      const { buffer } = await this.pdfService.generatePdfFromBooking(bookingId);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="booking-${bookingId}.pdf"`);
      res.send(buffer);
    } catch (error) {
      this.handleError(error, 'Booking');
    }
  }

  private handleError(error: unknown, entity: string): never {
    if (error instanceof HttpException) throw error;
    
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('bulunamadı')) {
      throw new NotFoundException(`${entity} bulunamadı`);
    }
    throw new HttpException('PDF oluşturulamadı', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
