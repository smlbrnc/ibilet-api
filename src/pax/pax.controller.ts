import { Controller, Post, Body, Req, Headers, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Request } from 'express';
import { TokenManagerService } from './token-manager.service';
import { PaxHttpService } from './pax-http.service';
import { DepartureRequestDto } from './dto/departure-request.dto';
import { ArrivalRequestDto } from './dto/arrival-request.dto';
import { CheckinDatesRequestDto } from './dto/checkin-dates-request.dto';
import { FlightPriceSearchDto } from './dto/flight-price-search.dto';
import { HotelPriceSearchDto } from './dto/hotel-price-search.dto';
import { GetOffersRequestDto } from './dto/get-offers-request.dto';
import { ProductInfoRequestDto } from './dto/product-info-request.dto';
import { OfferDetailsRequestDto } from './dto/offer-details-request.dto';
import { FareRulesRequestDto } from './dto/fare-rules-request.dto';
import { ConfigService } from '@nestjs/config';
import { handlePaxApiError } from '../common/utils/error-handler.util';

@ApiTags('API')
@Controller('')
export class PaxController {
  constructor(
    private readonly tokenManagerService: TokenManagerService,
    private readonly paxHttp: PaxHttpService,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private async getUserInfoFromToken(
    authorization?: string,
  ): Promise<{ userId: string | null; email: string | null }> {
    // Simplified - Supabase integration removed for now
    return { userId: null, email: null };
  }

  private async executePaxRequest<T>(
    endpointKey: string,
    request: T,
    errorCode: string,
    errorMessage: string,
    req?: Request,
    authorization?: string,
  ): Promise<any> {
    try {
      const baseUrl = this.config.get<string>('pax.baseUrl');
      const endpoint = this.config.get<string>(`pax.endpoints.${endpointKey}`);

      const ip = req?.ip || req?.socket?.remoteAddress || undefined;
      const userInfo =
        req && authorization
          ? await this.getUserInfoFromToken(authorization)
          : { userId: null, email: null };

      const result = await this.paxHttp.post(`${baseUrl}${endpoint}`, request, {
        ip,
        userId: userInfo.userId ?? undefined,
        email: userInfo.email ?? undefined,
      });
      return result.body || result;
    } catch (error) {
      handlePaxApiError(error, errorCode, errorMessage);
    }
  }

  @Post('token')
  @ApiOperation({ summary: 'Token yenileme (manuel)' })
  @ApiResponse({ status: 200, description: 'Token yenilendi' })
  async refreshToken() {
    try {
      const token = await this.tokenManagerService.getValidToken();
      return {
        message: 'Token başarıyla yenilendi',
        hasToken: !!token,
      };
    } catch (error) {
      handlePaxApiError(error, 'TOKEN_REFRESH_ERROR', 'Token yenileme başarısız');
    }
  }

  @Post('departure')
  @ApiOperation({ summary: 'Kalkış noktası arama' })
  @ApiResponse({ status: 200, description: 'Kalkış noktaları' })
  async getDeparture(
    @Body() request: DepartureRequestDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
  ) {
    const cacheKey = `pax:departure:${JSON.stringify(request)}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const result = await this.executePaxRequest(
      'departure',
      request,
      'DEPARTURE_SEARCH_ERROR',
      'Kalkış noktası arama başarısız',
      req,
      authorization,
    );
    await this.cacheManager.set(cacheKey, result, 3600 * 1000);
    return result;
  }

  @Post('arrival')
  @ApiOperation({ summary: 'Varış noktası / Otel konaklama yeri arama' })
  @ApiResponse({ status: 200, description: 'Varış noktaları / Otel listesi' })
  async getArrival(
    @Body() request: ArrivalRequestDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
  ) {
    const cacheKey = `pax:arrival:${JSON.stringify(request)}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const result = await this.executePaxRequest(
      'arrival',
      request,
      'ARRIVAL_SEARCH_ERROR',
      'Varış noktası arama başarısız',
      req,
      authorization,
    );
    await this.cacheManager.set(cacheKey, result, 3600 * 1000);
    return result;
  }

  @Post('checkin-dates')
  @ApiOperation({ summary: 'Check-in tarihleri' })
  @ApiResponse({ status: 200, description: 'Check-in tarihleri' })
  async getCheckinDates(
    @Body() request: CheckinDatesRequestDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
  ) {
    const cacheKey = `pax:checkin-dates:${JSON.stringify(request)}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const result = await this.executePaxRequest(
      'checkinDates',
      request,
      'CHECKIN_DATES_ERROR',
      'Check-in tarihleri alınamadı',
      req,
      authorization,
    );
    await this.cacheManager.set(cacheKey, result, 1800 * 1000);
    return result;
  }

  @Post('price-search')
  @ApiOperation({ summary: 'Fiyat arama (Uçak/Otel)' })
  @ApiResponse({ status: 200, description: 'Fiyat sonuçları' })
  async priceSearch(
    @Body() request: FlightPriceSearchDto | HotelPriceSearchDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
  ) {
    return this.executePaxRequest(
      'priceSearch',
      request,
      'PRICE_SEARCH_ERROR',
      'Fiyat arama başarısız',
      req,
      authorization,
    );
  }

  @Post('get-offers')
  @ApiOperation({ summary: 'Teklifleri getir (Get Offers)' })
  @ApiResponse({ status: 200, description: 'Teklif detayları' })
  async getOffers(
    @Body() request: GetOffersRequestDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
  ) {
    return this.executePaxRequest(
      'getOffers',
      request,
      'GET_OFFERS_ERROR',
      'Teklif detayları alınamadı',
      req,
      authorization,
    );
  }

  @Post('product-info')
  @ApiOperation({ summary: 'Ürün bilgisi getir (Product Info)' })
  @ApiResponse({ status: 200, description: 'Ürün detayları' })
  async getProductInfo(
    @Body() request: ProductInfoRequestDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
  ) {
    return this.executePaxRequest(
      'productInfo',
      request,
      'PRODUCT_INFO_ERROR',
      'Ürün bilgisi alınamadı',
      req,
      authorization,
    );
  }

  @Post('offer-details')
  @ApiOperation({ summary: 'Teklif detayları getir (Offer Details)' })
  @ApiResponse({ status: 200, description: 'Teklif detayları ve ürün bilgileri' })
  async getOfferDetails(
    @Body() request: OfferDetailsRequestDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
  ) {
    return this.executePaxRequest(
      'offerDetails',
      request,
      'OFFER_DETAILS_ERROR',
      'Teklif detayları alınamadı',
      req,
      authorization,
    );
  }

  @Post('fare-rules')
  @ApiOperation({ summary: 'Uçuş ücret kurallarını getir (Fare Rules)' })
  @ApiResponse({ status: 200, description: 'Ücret kuralları detayları' })
  async getFareRules(
    @Body() request: FareRulesRequestDto,
    @Req() req: Request,
    @Headers('authorization') authorization?: string,
  ) {
    return this.executePaxRequest(
      'fareRules',
      request,
      'FARE_RULES_ERROR',
      'Ücret kuralları alınamadı',
      req,
      authorization,
    );
  }
}

