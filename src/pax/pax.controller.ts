import { Controller, Post, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { PaxService, PaxRequestOptions } from './pax.service';
import { DepartureRequestDto } from './dto/departure-request.dto';
import { ArrivalRequestDto } from './dto/arrival-request.dto';
import { CheckinDatesRequestDto } from './dto/checkin-dates-request.dto';
import { FlightPriceSearchDto } from './dto/flight-price-search.dto';
import { HotelPriceSearchDto } from './dto/hotel-price-search.dto';
import { GetOffersRequestDto } from './dto/get-offers-request.dto';
import { GetOfferDetailsRequestDto } from './dto/get-offer-details-request.dto';
import { ProductInfoRequestDto } from './dto/product-info-request.dto';
import { FareRulesRequestDto } from './dto/fare-rules-request.dto';
import { handlePaxApiError } from '../common/utils/error-handler.util';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('API')
@Controller('')
export class PaxController {
  constructor(private readonly paxService: PaxService) {}

  private getRequestOptions(req: Request): PaxRequestOptions {
    return { ip: req.ip || req.socket.remoteAddress || undefined };
  }

  @Public()
  @Post('token')
  @ApiOperation({ summary: 'Token yenileme (manuel)' })
  @ApiResponse({ status: 200, description: 'Token yenilendi' })
  async refreshToken() {
    try {
      return await this.paxService.refreshToken();
    } catch (error) {
      handlePaxApiError(error, 'TOKEN_REFRESH_ERROR', 'Token yenileme başarısız');
    }
  }

  @Public()
  @Post('departure')
  @ApiOperation({ summary: 'Kalkış noktası arama' })
  @ApiResponse({ status: 200, description: 'Kalkış noktaları' })
  async getDeparture(@Body() request: DepartureRequestDto, @Req() req: Request) {
    try {
      return await this.paxService.getDeparture(request, this.getRequestOptions(req));
    } catch (error) {
      handlePaxApiError(error, 'DEPARTURE_SEARCH_ERROR', 'Kalkış noktası arama başarısız');
    }
  }

  @Public()
  @Post('arrival')
  @ApiOperation({ summary: 'Varış noktası / Otel konaklama yeri arama' })
  @ApiResponse({ status: 200, description: 'Varış noktaları / Otel listesi' })
  async getArrival(@Body() request: ArrivalRequestDto, @Req() req: Request) {
    try {
      return await this.paxService.getArrival(request, this.getRequestOptions(req));
    } catch (error) {
      handlePaxApiError(error, 'ARRIVAL_SEARCH_ERROR', 'Varış noktası arama başarısız');
    }
  }

  @Public()
  @Post('checkin-dates')
  @ApiOperation({ summary: 'Check-in tarihleri' })
  @ApiResponse({ status: 200, description: 'Check-in tarihleri' })
  async getCheckinDates(@Body() request: CheckinDatesRequestDto, @Req() req: Request) {
    try {
      return await this.paxService.getCheckinDates(request, this.getRequestOptions(req));
    } catch (error) {
      handlePaxApiError(error, 'CHECKIN_DATES_ERROR', 'Check-in tarihleri alınamadı');
    }
  }

  @Public()
  @Post('price-search')
  @ApiOperation({ summary: 'Fiyat arama (Uçak/Otel)' })
  @ApiResponse({ status: 200, description: 'Fiyat sonuçları' })
  async priceSearch(@Body() request: FlightPriceSearchDto | HotelPriceSearchDto, @Req() req: Request) {
    try {
      return await this.paxService.priceSearch(request, this.getRequestOptions(req));
    } catch (error) {
      handlePaxApiError(error, 'PRICE_SEARCH_ERROR', 'Fiyat arama başarısız');
    }
  }

  @Public()
  @Post('get-offers')
  @ApiOperation({
    summary: 'Teklifleri getir (Get Offers)',
    description: 'Uçak veya Otel tekliflerini getirmek için kullanılır. productType değerine göre farklı parametreler kullanılır.',
  })
  @ApiResponse({ status: 200, description: 'Teklif detayları' })
  @ApiBody({
    type: GetOffersRequestDto,
    examples: {
      ucak: {
        summary: 'Uçak için örnek (productType: 3)',
        value: {
          productType: 3,
          searchId: '52143f58-1fa2-4689-a8c6-59ffc1ff04e8',
          offerIds: ['F0BQUFwNnZvTUZkNV96VDdER19hcFdaTXh3PT0'],
          currency: 'TRY',
          culture: 'en-US',
        },
      },
      otel: {
        summary: 'Otel için örnek (productType: 2)',
        value: {
          productType: 2,
          searchId: 'f43dcb3a-0214-4d17-8838-7540c815245d',
          offerId: '2$2$05ba9a42-24a8-41ce-bc61-40e6c443f9e5',
          productId: '105841',
          currency: 'EUR',
          culture: 'tr-TR',
          getRoomInfo: true,
        },
      },
    },
  })
  async getOffers(@Body() request: GetOffersRequestDto, @Req() req: Request) {
    try {
      return await this.paxService.getOffers(request, this.getRequestOptions(req));
    } catch (error) {
      handlePaxApiError(error, 'GET_OFFERS_ERROR', 'Teklif detayları alınamadı');
    }
  }

  @Public()
  @Post('get-offer-details')
  @ApiOperation({ summary: 'Teklif detayları ve ürün bilgisi getir (Get Offer Details)' })
  @ApiResponse({ status: 200, description: 'Detaylı teklif ve ürün bilgileri' })
  async getOfferDetails(@Body() request: GetOfferDetailsRequestDto, @Req() req: Request) {
    try {
      return await this.paxService.getOfferDetails(request, this.getRequestOptions(req));
    } catch (error) {
      handlePaxApiError(error, 'GET_OFFER_DETAILS_ERROR', 'Teklif detayları ve ürün bilgisi alınamadı');
    }
  }

  @Public()
  @Post('product-info')
  @ApiOperation({ summary: 'Ürün bilgisi getir (Product Info)' })
  @ApiResponse({ status: 200, description: 'Ürün detayları' })
  async getProductInfo(@Body() request: ProductInfoRequestDto, @Req() req: Request) {
    try {
      return await this.paxService.getProductInfo(request, this.getRequestOptions(req));
    } catch (error) {
      handlePaxApiError(error, 'PRODUCT_INFO_ERROR', 'Ürün bilgisi alınamadı');
    }
  }

  @Public()
  @Post('fare-rules')
  @ApiOperation({ summary: 'Uçuş ücret kurallarını getir (Fare Rules)' })
  @ApiResponse({ status: 200, description: 'Ücret kuralları detayları' })
  async getFareRules(@Body() request: FareRulesRequestDto, @Req() req: Request) {
    try {
      return await this.paxService.getFareRules(request, this.getRequestOptions(req));
    } catch (error) {
      handlePaxApiError(error, 'FARE_RULES_ERROR', 'Ücret kuralları alınamadı');
    }
  }
}
