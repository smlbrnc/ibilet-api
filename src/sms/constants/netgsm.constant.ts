/**
 * Netgsm API sabitleri
 */

export const NETGSM_URLS = {
  SMS: 'https://api.netgsm.com.tr/sms/send/get',
  BALANCE: 'https://api.netgsm.com.tr/balance',
} as const;

export const NETGSM_TIMEOUT = 15000; // 15 saniye

export const SMS_SUCCESS_MESSAGES: Record<string, string> = {
  '00': 'SMS başarıyla gönderildi',
  '01': 'SMS başarıyla gönderildi (tarih düzeltildi)',
  '02': 'SMS başarıyla gönderildi (bitiş tarihi düzeltildi)',
};

export const SMS_ERROR_MESSAGES: Record<string, string> = {
  '20': 'Mesaj metni problemi veya karakter sınırı aşımı',
  '30': 'Geçersiz kullanıcı adı/şifre veya API erişim izni yok',
  '40': 'Mesaj başlığı sistemde tanımlı değil',
  '50': 'İYS kontrollü gönderim yapılamıyor',
  '70': 'Hatalı sorgulama - parametre hatası',
  '80': 'Gönderim sınır aşımı',
};

export const BALANCE_ERROR_MESSAGES: Record<string, string> = {
  '30': 'Geçersiz kullanıcı adı/şifre',
  '60': 'Paket/kampanya bulunamadı',
  '70': 'Parametre hatası',
};

export const SMS_SUCCESS_CODES = ['00', '01', '02'];

