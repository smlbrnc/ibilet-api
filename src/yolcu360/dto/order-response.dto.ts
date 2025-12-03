import { ApiProperty } from '@nestjs/swagger';

class PricingDto {
  @ApiProperty({ description: 'Fiyat miktarı', example: 50000 })
  amount: number;

  @ApiProperty({ description: 'Para birimi', example: 'TRY' })
  currency: string;
}

class TotalPricingDto {
  @ApiProperty({ description: 'Toplam fiyat', type: () => PricingDto })
  total: PricingDto;

  @ApiProperty({ description: 'Ödeme toplamı', type: () => PricingDto, required: false })
  paymentTotal?: PricingDto;
}

class BrandDto {
  @ApiProperty({ description: 'Marka ID', example: 'toyota' })
  id: string;

  @ApiProperty({ description: 'Marka adı', example: 'Toyota' })
  name: string;
}

class ModelDto {
  @ApiProperty({ description: 'Model ID', example: 'corolla' })
  id: string;

  @ApiProperty({ description: 'Model adı', example: 'Corolla' })
  name: string;
}

class CarClassDto {
  @ApiProperty({ description: 'Sınıf ID', example: 'economy' })
  id: string;

  @ApiProperty({ description: 'Sınıf adı', example: 'Economy' })
  name: string;
}

class CarDto {
  @ApiProperty({ description: 'Araç kodu', example: 'ECAR' })
  code: string;

  @ApiProperty({ description: 'Arama ID', example: 'search_123456789' })
  searchID: string;

  @ApiProperty({ description: 'Marka bilgisi', type: () => BrandDto })
  brand: BrandDto;

  @ApiProperty({ description: 'Model bilgisi', type: () => ModelDto })
  model: ModelDto;

  @ApiProperty({ description: 'Sınıf bilgisi', type: () => CarClassDto })
  class: CarClassDto;

  @ApiProperty({ description: 'Araç görsel URL', example: 'https://example.com/car-image.jpg', required: false })
  imageURL?: string;

  @ApiProperty({ description: 'Fiyatlandırma bilgisi', type: () => TotalPricingDto })
  pricing: TotalPricingDto;
}

class OrderedCarProductDto {
  @ApiProperty({ description: 'Sipariş ID', example: 1001 })
  id: number;

  @ApiProperty({ description: 'Durum', example: 'pending', enum: ['pending', 'reserved', 'failed', 'cancelled', 'removed'] })
  status: string;

  @ApiProperty({ description: 'Miktar', example: 1 })
  quantity: number;

  @ApiProperty({ description: 'Tam kredi kullanımı', example: true })
  isFullCredit: boolean;

  @ApiProperty({ description: 'Sınırlı kredi kullanımı', example: false })
  isLimitedCredit: boolean;

  @ApiProperty({ description: 'Satıcı tarafından iptal edildi', example: false })
  vendorCancelled: boolean;

  @ApiProperty({ description: 'Oluşturulma tarihi', example: '2024-12-25T10:00:00Z' })
  createdAt: string;

  @ApiProperty({ description: 'Güncellenme tarihi', example: '2024-12-25T10:00:00Z' })
  updatedAt: string;

  @ApiProperty({ description: 'Araç bilgisi', type: () => CarDto })
  car: CarDto;
}

class ExtraProductPricingDto {
  @ApiProperty({ description: 'Toplam fiyat', type: () => PricingDto })
  total: PricingDto;
}

class ExtraProductDto {
  @ApiProperty({ description: 'Ürün kodu', example: 'GPS' })
  code: string;

  @ApiProperty({ description: 'Ürün adı', example: 'GPS Navigation System' })
  name: string;

  @ApiProperty({ description: 'Ürün tipi', example: 'equipment' })
  type: string;

  @ApiProperty({ description: 'Fiyatlandırma bilgisi', type: () => ExtraProductPricingDto })
  pricing: ExtraProductPricingDto;
}

class OrderedExtraProductDto {
  @ApiProperty({ description: 'Sipariş ID', example: 1002 })
  id: number;

  @ApiProperty({ description: 'Durum', example: 'pending', enum: ['pending', 'reserved', 'failed', 'cancelled', 'removed'] })
  status: string;

  @ApiProperty({ description: 'Miktar', example: 1 })
  quantity: number;

  @ApiProperty({ description: 'Satıcı tarafından iptal edildi', example: false })
  vendorCancelled: boolean;

  @ApiProperty({ description: 'Oluşturulma tarihi', example: '2024-12-25T10:00:00Z' })
  createdAt: string;

  @ApiProperty({ description: 'Güncellenme tarihi', example: '2024-12-25T10:00:00Z' })
  updatedAt: string;

  @ApiProperty({ description: 'Ekstra ürün bilgisi', type: () => ExtraProductDto })
  extraProduct: ExtraProductDto;
}

class PassengerResponseDto {
  @ApiProperty({ description: 'Ad', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'Soyad', example: 'Doe' })
  lastName: string;

  @ApiProperty({ description: 'E-posta', example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ description: 'Uyruk', example: 'US' })
  nationality: string;

  @ApiProperty({ description: 'Telefon', example: '+1234567890' })
  phone: string;
}

class BillingResponseDto {
  @ApiProperty({ description: 'Adres tipi', example: 'individual' })
  type: string;

  @ApiProperty({ description: 'Ad', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'Soyad', example: 'Doe', required: false })
  lastName?: string;

  @ApiProperty({ description: 'E-posta', example: 'john.doe@example.com', required: false })
  email?: string;

  @ApiProperty({ description: 'Telefon', example: '+1234567890', required: false })
  phone?: string;
}

export class OrderResponseDto {
  @ApiProperty({ description: 'Sipariş ID', example: 'order_123456789' })
  id: string;

  @ApiProperty({ description: 'Ödeme tipi', example: 'creditCard' })
  paymentType: string;

  @ApiProperty({ description: 'Ödeme para birimi', example: 'TRY' })
  paymentCurrency: string;

  @ApiProperty({ description: 'Dil', example: 'en' })
  language: string;

  @ApiProperty({ description: 'Oluşturulma tarihi', example: '2024-12-25T10:00:00Z' })
  createdAt: string;

  @ApiProperty({ description: 'Güncellenme tarihi', example: '2024-12-25T10:00:00Z' })
  updatedAt: string;

  @ApiProperty({ description: 'Yolcu bilgisi', type: () => PassengerResponseDto })
  passenger: PassengerResponseDto;

  @ApiProperty({ description: 'Fatura bilgisi', type: () => BillingResponseDto, required: false })
  billing?: BillingResponseDto;

  @ApiProperty({ description: 'Sipariş edilen araç ürünü', type: () => OrderedCarProductDto })
  orderedCarProduct: OrderedCarProductDto;

  @ApiProperty({ description: 'Sipariş edilen ekstra ürünler', type: () => [OrderedExtraProductDto] })
  orderedExtraProducts: OrderedExtraProductDto[];
}