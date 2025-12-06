export enum VposErrorCode {
  // Validation Errors
  INVALID_CHARACTERS = '0001',
  MANDATORY_FIELD_MISSING = '0002',
  INVALID_CARD_EXPIRE_DATE = '0003',
  INVALID_ORDER_ID_LENGTH = '0231',

  // Transaction Errors
  TRANSACTION_NOT_FOUND = '0101',
  PREAUTH_NOT_FOUND = '0102',
  REFUND_TRANSACTION_NOT_FOUND = '0103',
  MULTIPLE_SALES_IN_ORDER = '0104',
  SECURITY_CODE_ERROR = '0099',
  SYSTEM_ERROR = '99',
  ORDER_NOT_FOUND = '0108',
  NO_SALES_IN_ORDER = '0109',
  TRANSACTION_NOT_FOUND_ALT = '0110',
  ORDER_APPROVED = '0111',
  DCC_QUERY_NOT_FOUND = '0113',
  TRANSACTION_FAILED = '0122',

  // Refund/Cancel Errors
  CANCEL_TRANSACTION_NOT_FOUND = '0201',
  MULTIPLE_CANCEL_TRANSACTIONS = '0202',
  REFUND_NOT_FOUND = '0203',
  PREAUTH_CLOSE_NOT_FOUND = '0204',
  CANCEL_LAST_FIRST = '0207',
  INVALID_REFUND_TRANSACTION = '0208',
  INVALID_PREAUTH_CLOSE = '0209',
  INVALID_CANCEL_TRANSACTION = '0210',
  REFUND_AMOUNT_EXCEEDS_SALES = '0214',
  SALES_AMOUNT_TOO_SMALL = '0217',

  // Limit Errors
  DAILY_TRANSACTION_LIMIT_EXCEEDED = '0402',
  DAILY_IP_AMOUNT_LIMIT_EXCEEDED = '0405',

  // Auth Errors
  INVALID_USER_PASSWORD = '0651',
  UNAUTHORIZED_OPERATION = '0652',
  USER_NOT_DEFINED_IN_TERMINAL = '0653',
  USER_STATUS_CLOSED = '0654',

  // Terminal Errors
  TERMINAL_NOT_FOUND = '0752',
  INVALID_MERCHANT_ID = '0753',
  NO_RECURRING_PAYMENT_PERMISSION = '0756',
  NO_FOREIGN_CURRENCY_PERMISSION = '0759',
  MISSING_3D_FIELDS = '0763',
  NO_MOTO_PERMISSION = '0764',
  IP_NOT_ALLOWED = '0769',
  TRANSACTION_FAILED_ALT1 = '0770',
  TRANSACTION_FAILED_ALT2 = '0771',
  TRANSACTION_FAILED_ALT3 = '0773',
  NO_GRANTIPAY_PERMISSION = '0785',

  // Security Errors
  MD_SECURITY_VERIFICATION_ERROR = '0804',

  // System Errors
  GENERAL_EXCEPTION = '9999',
  TIMEOUT = '9998',
}

export const VposErrorMessages: Record<VposErrorCode, string> = {
  [VposErrorCode.INVALID_CHARACTERS]:
    'Giriş yaptığınız değerleri kontrol ediniz. Invalid characters!',
  [VposErrorCode.MANDATORY_FIELD_MISSING]:
    'Giriş yaptığınız işlem tipi için zorunlu alanları kontrol ediniz.',
  [VposErrorCode.INVALID_CARD_EXPIRE_DATE]:
    'Giriş yaptığınız değerleri kontrol ediniz. CardExpireDate field must be between 4 and 4 char.',
  [VposErrorCode.INVALID_ORDER_ID_LENGTH]: 'PGM:OY5CB040 (orderid max 32 karakter olmalı)',
  [VposErrorCode.TRANSACTION_NOT_FOUND]: 'İptal edilecek işlem bulunamadı ErrorId: 0101',
  [VposErrorCode.PREAUTH_NOT_FOUND]: 'Kapatılacak ön otorizasyon işlemi bulunamadı. ErrorId: 0102',
  [VposErrorCode.REFUND_TRANSACTION_NOT_FOUND]: 'İade edilecek işlem bulunamadı ErrorId: 0103',
  [VposErrorCode.MULTIPLE_SALES_IN_ORDER]:
    'Aynı sipariş içinde sadece bir tane satış işlemi yapılabilir. ErrorId: 0104',
  [VposErrorCode.SECURITY_CODE_ERROR]: 'Güvenlik kodu hatalı. ErrorId: 0099',
  [VposErrorCode.SYSTEM_ERROR]:
    'Sistem hatası sebebiyle işlem tamamlanamamaktadır. Bankayı aramanız gerekir.',
  [VposErrorCode.ORDER_NOT_FOUND]: 'Gönderilen sipariş numarasına ait kayıt bulunmamaktadır',
  [VposErrorCode.NO_SALES_IN_ORDER]:
    'Bu sipariş bilgilerinde herhangi bir satış işlemi bulunmamaktadır.',
  [VposErrorCode.TRANSACTION_NOT_FOUND_ALT]: 'İşlem bulunamadı.',
  [VposErrorCode.ORDER_APPROVED]: 'Sipariş onaylanmış, sorgulama için yeni sipariş kullanınız',
  [VposErrorCode.DCC_QUERY_NOT_FOUND]: 'DCC sorgu sonucu bulunamadi.',
  [VposErrorCode.TRANSACTION_FAILED]: 'İşleminizi gerçekleştiremiyoruz. Tekrar deneyiniz',
  [VposErrorCode.CANCEL_TRANSACTION_NOT_FOUND]: 'İptal edilecek işlem bulunamadı ErrorId: 0201',
  [VposErrorCode.MULTIPLE_CANCEL_TRANSACTIONS]:
    'İptal edebileceğiniz birden fazla işlem var, RRN bilgisi gönderin',
  [VposErrorCode.REFUND_NOT_FOUND]: 'İade edilecek işlem bulunamadı.',
  [VposErrorCode.PREAUTH_CLOSE_NOT_FOUND]:
    'Kapatılacak ön otorizasyon işlemi bulunamadı ErrorId: 0205',
  [VposErrorCode.CANCEL_LAST_FIRST]:
    'İlk önce, en son yapılan işlemi iptal etmelisiniz. ErrorId: 0207',
  [VposErrorCode.INVALID_REFUND_TRANSACTION]:
    'İade etmek istediğiniz işlem geçerli değil ErrorId: 0208',
  [VposErrorCode.INVALID_PREAUTH_CLOSE]:
    'Kapama yapmak istediğiniz ön otorizasyon işlemi geçerli değil. ErrorId: 0209',
  [VposErrorCode.INVALID_CANCEL_TRANSACTION]:
    'İptal etmek istediğiniz işlem geçerli değil ErrorId: 0210',
  [VposErrorCode.REFUND_AMOUNT_EXCEEDS_SALES]: 'İade tutarı, satış tutarından büyük olamaz',
  [VposErrorCode.SALES_AMOUNT_TOO_SMALL]:
    'Satış tutarı, kullanılan ödül ve çek toplamından küçük olamaz.',
  [VposErrorCode.DAILY_TRANSACTION_LIMIT_EXCEEDED]:
    'Aynı kart numarası için tanımlı günlük işlem adedi aşılıyor',
  [VposErrorCode.DAILY_IP_AMOUNT_LIMIT_EXCEEDED]:
    'Aynı IP numarası için tanımlı günlük işlem tutarı aşılıyor',
  [VposErrorCode.INVALID_USER_PASSWORD]: 'Kullanıcı şifresi hatalı. ErrorId: 0651',
  [VposErrorCode.UNAUTHORIZED_OPERATION]: 'Üzgünüz, bu işlemi yapmaya yetkiniz yok. ErrorId: 0652',
  [VposErrorCode.USER_NOT_DEFINED_IN_TERMINAL]:
    'Kullanıcı bu terminalde tanımlı değildir. ErrorId: 0653',
  [VposErrorCode.USER_STATUS_CLOSED]: 'Kullanıcı statüsü kapalı. ErrorId: 0654',
  [VposErrorCode.TERMINAL_NOT_FOUND]: 'Terminal kaydı yok ErrorId: 0752',
  [VposErrorCode.INVALID_MERCHANT_ID]: 'Bu terminal için yanlış işyeri numarası girilmiştir.',
  [VposErrorCode.NO_RECURRING_PAYMENT_PERMISSION]:
    'Bu terminalde tekrarlı ödeme yapma yetkisi yoktur',
  [VposErrorCode.NO_FOREIGN_CURRENCY_PERMISSION]:
    'Bu terminalde farklı döviz kodunda işlem yetkisi yoktur',
  [VposErrorCode.MISSING_3D_FIELDS]: '3D alanlarını girmelisiniz',
  [VposErrorCode.NO_MOTO_PERMISSION]: 'Bu terminalde moto kullanımı yetkisi yoktur. ErrorId: 0764',
  [VposErrorCode.IP_NOT_ALLOWED]: "Terminal için tanımlı IP'ler haricinde işlem gelemez.",
  [VposErrorCode.TRANSACTION_FAILED_ALT1]: 'İşleminizi gerçekleştiremiyoruz. Tekrar deneyiniz',
  [VposErrorCode.TRANSACTION_FAILED_ALT2]: 'İşleminizi gerçekleştiremiyoruz. Tekrar deneyiniz',
  [VposErrorCode.TRANSACTION_FAILED_ALT3]: 'İşleminizi gerçekleştiremiyoruz. Tekrar deneyiniz',
  [VposErrorCode.NO_GRANTIPAY_PERMISSION]: 'Garntipay yetkisi yok',
  [VposErrorCode.MD_SECURITY_VERIFICATION_ERROR]:
    'MD güvenlik doğrulamasında hata. (işlem miktarı veya işlem ID si yanlış girilmiş olabilir) ErrorId: 0804',
  [VposErrorCode.GENERAL_EXCEPTION]:
    'İşleminizi gerçekleştiremiyoruz. Lütfen daha sonra tekrar deneyiniz. General Exception :null',
  [VposErrorCode.TIMEOUT]: 'Zaman aşımı oluştu. Lütfen daha sonra tekrar deneyiniz.',
};
