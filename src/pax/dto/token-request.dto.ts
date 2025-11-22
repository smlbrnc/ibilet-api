import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class TokenRequestDto {
  @ApiProperty({ example: 'PXM25847' })
  @IsString()
  @IsNotEmpty()
  Agency: string;

  @ApiProperty({ example: 'USR1' })
  @IsString()
  @IsNotEmpty()
  User: string;

  @ApiProperty({ example: '!23' })
  @IsString()
  @IsNotEmpty()
  Password: string;
}

