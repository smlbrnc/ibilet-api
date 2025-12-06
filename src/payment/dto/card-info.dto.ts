import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches, MinLength, MaxLength } from 'class-validator';

export class CardInfoDto {
  @ApiProperty({
    description: 'Kart sahibinin adı',
    example: 'Mehmet Daldeviren',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  cardholderName: string;

  @ApiProperty({
    description: 'Kart numarası (13-19 haneli)',
    example: '5406697543211173',
    pattern: '^[0-9]{13,19}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{13,19}$/, {
    message: 'Kart numarası 13-19 haneli olmalıdır',
  })
  cardNumber: string;

  @ApiProperty({
    description: 'Son kullanma ayı (MM formatında)',
    example: '04',
    pattern: '^(0[1-9]|1[0-2])$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0[1-9]|1[0-2])$/, {
    message: 'Son kullanma ayı 01-12 arasında olmalıdır',
  })
  cardExpireMonth: string;

  @ApiProperty({
    description: 'Son kullanma yılı (YY formatında)',
    example: '27',
    pattern: '^[0-9]{2}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{2}$/, {
    message: 'Son kullanma yılı 2 haneli olmalıdır',
  })
  cardExpireYear: string;

  @ApiProperty({
    description: 'CVV2 güvenlik kodu (3-4 haneli)',
    example: '465',
    pattern: '^[0-9]{3,4}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{3,4}$/, {
    message: 'CVV2 kodu 3-4 haneli olmalıdır',
  })
  cardCvv2: string;
}
