import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CommitTransactionRequestDto {
  @ApiProperty({
    description: 'Transaction ID',
    example: 'fad80a51-3ed0-4502-b623-31992a73aa14',
  })
  @IsNotEmpty()
  @IsString()
  transactionId: string;
}
