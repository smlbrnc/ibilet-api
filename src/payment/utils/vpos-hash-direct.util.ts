import * as crypto from 'crypto';

/**
 * Garanti VPOS Hash Hesaplama Utility - 3D Secure OLMADAN (Direct Payment)
 * SHA1 ve SHA512 algoritmaları kullanarak hash değerleri hesaplar
 */
export class VPOSHashDirect {
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
   * @param userPassword - Kullanıcı şifresi (terminaluserid password)
   * @param terminalId - Terminal ID
   * @returns HashedPassword değeri
   */
  static getHashedPassword(userPassword: string, terminalId: string): string {
    // Java koduna göre: userPassword + "0" + terminalId
    const data = userPassword + "0" + terminalId;
    return this.sha1(data);
  }

  /**
   * 3D Secure olmadan (direct) hash değeri hesaplama
   */
  static getHashData(params: {
    userPassword: string;
    terminalId: string;
    orderId: string;
    cardNumber?: string;
    amount: number;
    currencyCode: string;
  }): string {
    const {
      userPassword,
      terminalId,
      orderId,
      cardNumber,
      amount,
      currencyCode,
    } = params;

    const hashedPassword = this.getHashedPassword(userPassword, terminalId);
    
    // 3D'siz işlemler için hash sırası
    // Sales: orderId + terminalId + cardNumber + amount + currencyCode + hashedPassword
    // Refund: orderId + terminalId + amount + currencyCode + hashedPassword (cardNumber YOK)
    let hashString: string;
    if (cardNumber) {
      // Sales işlemi - kart numarası ile
      hashString = orderId + terminalId + cardNumber + amount + currencyCode + hashedPassword;
    } else {
      // Refund işlemi - kart numarası olmadan
      hashString = orderId + terminalId + amount + currencyCode + hashedPassword;
    }
    
    return this.sha512(hashString);
  }
}

// Export function for easier use
export function getHashData(params: {
  userPassword: string;
  terminalId: string;
  orderId: string;
  cardNumber?: string;
  amount: number;
  currencyCode: string;
}): string {
  return VPOSHashDirect.getHashData(params);
}

