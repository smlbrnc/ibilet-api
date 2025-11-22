import { HttpException, HttpStatus } from '@nestjs/common';

export function handlePaxApiError(error: any, code: string, message: string): never {
  let errorMessage = error instanceof Error ? error.message : String(error);

  // PAX API ön eklerini temizle
  errorMessage = errorMessage.replace(/^PAX API POST isteği başarısız: /, '');
  errorMessage = errorMessage.replace(/^PAX API yanıtında hata: /, '');
  errorMessage = errorMessage.replace(/^PAX API POST Hatası \[.*?\]: /, '');

  throw new HttpException(
    {
      success: false,
      code,
      message: errorMessage || message,
      details: error,
    },
    HttpStatus.BAD_GATEWAY,
  );
}

