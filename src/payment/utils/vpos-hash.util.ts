import * as crypto from 'crypto';

/**
 * Garanti VPOS Hash Hesaplama Utility - 3D Secure İLE (3D_PAY)
 * SHA1 ve SHA512 algoritmaları kullanarak hash değerleri hesaplar
 */
export class VPOSHash {
  /**
   * SHA1 hash hesaplama (ISO-8859-9 charset ile)
   * @param data - Hash'lenecek veri
   * @returns SHA1 hash değeri (büyük harf)
   */
  static sha1(data: string): string {
    return crypto.createHash('sha1').update(data, 'latin1').digest('hex').toUpperCase();
  }

  /**
   * SHA512 hash hesaplama (ISO-8859-9 charset ile)
   * @param data - Hash'lenecek veri
   * @returns SHA512 hash değeri (büyük harf)
   */
  static sha512(data: string): string {
    return crypto.createHash('sha512').update(data, 'latin1').digest('hex').toUpperCase();
  }

  /**
   * HashedPassword hesaplama (Garanti dokümanına göre)
   * @param provisionPassword - Provizyon şifresi
   * @param terminalId - Terminal ID
   * @returns HashedPassword değeri
   */
  static getHashedPassword(provisionPassword: string, terminalId: string): string {
    // Java koduna göre: provisionPassword + "0" + terminalId
    const data = provisionPassword + "0" + terminalId;
    return this.sha1(data);
  }

  /**
   * 3D Secure ile hash değeri hesaplama (Garanti'nin beklediği format)
   */
  static getHashData(params: {
    terminalId: string;
    orderId: string;
    amount: number;
    currencyCode: string;
    successUrl: string;
    errorUrl: string;
    type: string;
    installmentCount: number | string;
    storeKey: string;
    provisionPassword: string;
  }): string {
    const {
      terminalId,
      orderId,
      amount,
      currencyCode,
      successUrl,
      errorUrl,
      type,
      installmentCount,
      storeKey,
      provisionPassword,
    } = params;

    const hashedPassword = this.getHashedPassword(provisionPassword, terminalId);
    
    // 3D Secure için hash sırası: terminalId + orderId + amount + currencyCode + successUrl + errorUrl + type + installmentCount + storeKey + hashedPassword
    const hashString = terminalId + orderId + amount + currencyCode + successUrl + errorUrl + type + installmentCount + storeKey + hashedPassword;
    
    return this.sha512(hashString);
  }
}

// Export function for easier use
export function getHashData(params: {
  terminalId: string;
  orderId: string;
  amount: number;
  currencyCode: string;
  successUrl: string;
  errorUrl: string;
  type: string;
  installmentCount: number | string;
  storeKey: string;
  provisionPassword: string;
}): string {
  return VPOSHash.getHashData(params);
}

