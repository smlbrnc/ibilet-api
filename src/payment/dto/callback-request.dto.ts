import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class CallbackRequestDto {
  @ApiProperty({ description: 'Sipariş ID', example: 'IB_1758739748270_Z22460' })
  @IsString()
  @IsNotEmpty()
  oid: string;

  @ApiProperty({ description: 'Sipariş ID (alternatif)', example: 'IB_1758739748270_Z22460' })
  @IsString()
  @IsOptional()
  orderid?: string;

  @ApiProperty({ description: 'İşlem sonucu (Approved/Declined)', example: 'Approved' })
  @IsString()
  @IsNotEmpty()
  response: string;

  @ApiPropertyOptional({ description: 'Provizyon kodu (00 = başarılı)', example: '00' })
  @IsString()
  @IsOptional()
  procreturncode?: string;

  @ApiPropertyOptional({ description: 'Yetkilendirme kodu', example: '716872' })
  @IsString()
  @IsOptional()
  authcode?: string;

  @ApiPropertyOptional({ description: '3D Secure durumu (1 = başarılı)' })
  @IsString()
  @IsOptional()
  mdstatus?: string;

  @ApiPropertyOptional({ description: '3D Secure hata mesajı' })
  @IsString()
  @IsOptional()
  mderrormessage?: string;

  @ApiPropertyOptional({ description: 'İşlem tutarı', example: '10000' })
  @IsString()
  @IsOptional()
  txnamount?: string;

  @ApiPropertyOptional({ description: 'Para birimi kodu', example: '949' })
  @IsString()
  @IsOptional()
  txncurrencycode?: string;

  @ApiPropertyOptional({ description: 'Hata mesajı' })
  @IsString()
  @IsOptional()
  errmsg?: string;

  @ApiPropertyOptional({ description: 'Banka referans numarası' })
  @IsString()
  @IsOptional()
  hostrefnum?: string;

  @ApiPropertyOptional({ description: 'Maskelenmiş kart numarası', example: '97920525****0015' })
  @IsString()
  @IsOptional()
  MaskedPan?: string;

  @ApiPropertyOptional({ description: 'Kart sahibi adı' })
  @IsString()
  @IsOptional()
  cardholdername?: string;

  @ApiPropertyOptional({ description: 'Hash değeri' })
  @IsString()
  @IsOptional()
  hash?: string;

  @ApiPropertyOptional({ description: 'Hash parametreleri' })
  @IsString()
  @IsOptional()
  hashparams?: string;

  @ApiPropertyOptional({ description: 'Hash parametre değerleri' })
  @IsString()
  @IsOptional()
  hashparamsval?: string;

  // Garanti VPOS callback'inden gelen diğer alanlar
  @ApiPropertyOptional({ description: 'Client ID' })
  @IsString()
  @IsOptional()
  clientid?: string;

  @ApiPropertyOptional({ description: 'Success URL' })
  @IsString()
  @IsOptional()
  successurl?: string;

  @ApiPropertyOptional({ description: 'Error URL' })
  @IsString()
  @IsOptional()
  errorurl?: string;

  @ApiPropertyOptional({ description: 'Taksit sayısı' })
  @IsString()
  @IsOptional()
  txninstallmentcount?: string;

  @ApiPropertyOptional({ description: 'Refresh time' })
  @IsString()
  @IsOptional()
  refreshtime?: string;

  @ApiPropertyOptional({ description: 'İşlem tipi' })
  @IsString()
  @IsOptional()
  txntype?: string;

  @ApiPropertyOptional({ description: 'Terminal Merchant ID' })
  @IsString()
  @IsOptional()
  terminalmerchantid?: string;

  @ApiPropertyOptional({ description: 'İşlem timestamp' })
  @IsString()
  @IsOptional()
  txntimestamp?: string;

  @ApiPropertyOptional({ description: 'Terminal User ID' })
  @IsString()
  @IsOptional()
  terminaluserid?: string;

  @ApiPropertyOptional({ description: 'Mode' })
  @IsString()
  @IsOptional()
  mode?: string;

  @ApiPropertyOptional({ description: '3D Secure hash' })
  @IsString()
  @IsOptional()
  secure3dhash?: string;

  @ApiPropertyOptional({ description: 'API Version' })
  @IsString()
  @IsOptional()
  apiversion?: string;

  @ApiPropertyOptional({ description: 'Şirket adı' })
  @IsString()
  @IsOptional()
  companyname?: string;

  @ApiPropertyOptional({ description: '3D Secure security level' })
  @IsString()
  @IsOptional()
  secure3dsecuritylevel?: string;

  @ApiPropertyOptional({ description: 'Müşteri e-posta adresi' })
  @IsString()
  @IsOptional()
  customeremailaddress?: string;

  @ApiPropertyOptional({ description: 'Müşteri IP adresi' })
  @IsString()
  @IsOptional()
  customeripaddress?: string;

  @ApiPropertyOptional({ description: 'Terminal ID' })
  @IsOptional()
  @Transform(({ value }) => value?.toString())
  terminalid?: string | number;

  @ApiPropertyOptional({ description: 'Terminal Provision User ID' })
  @IsString()
  @IsOptional()
  terminalprovuserid?: string;

  @ApiPropertyOptional({ description: 'Dil' })
  @IsString()
  @IsOptional()
  lang?: string;

  @ApiPropertyOptional({ description: 'CAVV' })
  @IsString()
  @IsOptional()
  cavv?: string;

  @ApiPropertyOptional({ description: 'ECI' })
  @IsString()
  @IsOptional()
  eci?: string;

  @ApiPropertyOptional({ description: 'MD' })
  @IsString()
  @IsOptional()
  md?: string;

  @ApiPropertyOptional({ description: 'RND' })
  @IsString()
  @IsOptional()
  rnd?: string;

  // 3D Secure ek alanları
  @ApiPropertyOptional({ description: 'XID' })
  @IsString()
  @IsOptional()
  xid?: string;

  @ApiPropertyOptional({ description: 'Transaction Status' })
  @IsString()
  @IsOptional()
  txnstatus?: string;

  @ApiPropertyOptional({ description: 'PARES Syntax OK' })
  @IsString()
  @IsOptional()
  paressyntaxok?: string;

  @ApiPropertyOptional({ description: 'PARES Verified' })
  @IsString()
  @IsOptional()
  paresverified?: string;

  @ApiPropertyOptional({ description: 'Version' })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiPropertyOptional({ description: 'IReq Code' })
  @IsString()
  @IsOptional()
  ireqcode?: string;

  @ApiPropertyOptional({ description: 'IReq Detail' })
  @IsString()
  @IsOptional()
  ireqdetail?: string;

  @ApiPropertyOptional({ description: 'Vendor Code' })
  @IsString()
  @IsOptional()
  vendorcode?: string;

  @ApiPropertyOptional({ description: 'CAVV Algorithm' })
  @IsString()
  @IsOptional()
  cavvalgorithm?: string;

  @ApiPropertyOptional({ description: 'Host Message' })
  @IsString()
  @IsOptional()
  hostmsg?: string;

  @ApiPropertyOptional({ description: 'Transaction ID' })
  @IsString()
  @IsOptional()
  transid?: string;

  @ApiPropertyOptional({ description: 'Garanti Card Indicator' })
  @IsString()
  @IsOptional()
  garanticardind?: string;

  // Diğer callback alanları (opsiyonel)
  [key: string]: any;
}

