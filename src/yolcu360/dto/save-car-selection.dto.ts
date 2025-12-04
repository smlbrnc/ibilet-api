import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveCarSelectionDto {
  @ApiProperty({
    description: 'Search ID (query parameter)',
    example: 'eyJ0IjoiY2FyIiwiZCI6eyJjIjp7InAiOiJkYWlseSIsImNpbyI6MTQ0NTg4LCJjb28iOjE0NDU4OCwiY2lEdCI6IjIwMjUtMTItMDVUMTA6MDA6MDArMDM6MDAiLCJjb0R0IjoiMjAyNS0xMi0wOFQxMDowMDowMCswMzowMCIsImNpbCI6eyJsYXQiOjQxLjI1NzYxLCJsb24iOjM2LjU1NTI0NH0sImNvbCI6eyJsYXQiOjQxLjI1NzYxLCJsb24iOjM2LjU1NTI0NH0sImwiOiJlbiIsImRjIjoiVFJZIiwicGMiOiJUUlkiLCJwdCI6ImNyZWRpdENhcmQiLCJvIjoxMTc5NywiYSI6IjI1IiwiY291IjoiVFIiLCJjaCI6IkdvLWh0dHAtY2xpZW50LzEuMSIsImNpcCI6IjEwLjkwLjE3Ny43MSIsInYiOiJ2MyJ9fX0',
  })
  @IsString()
  @IsNotEmpty()
  searchID: string;
}

