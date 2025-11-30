/**
 * Garanti VPOS Hash Hesaplama - 3D Secure OLMADAN (Direct Payment)
 */

import { sha512, getHashedPassword } from './hash-common.util';

interface HashDirectParams {
  userPassword: string;
  terminalId: string;
  orderId: string;
  cardNumber?: string;
  amount: number;
  currencyCode: string;
}

/**
 * 3D Secure olmadan (direct) hash değeri hesaplama
 */
export function getHashData(params: HashDirectParams): string {
  const { userPassword, terminalId, orderId, cardNumber, amount, currencyCode } = params;

  const hashedPassword = getHashedPassword(userPassword, terminalId);

  // Sales: orderId + terminalId + cardNumber + amount + currencyCode + hashedPassword
  // Refund: orderId + terminalId + amount + currencyCode + hashedPassword (cardNumber YOK)
  const hashString = cardNumber
    ? orderId + terminalId + cardNumber + amount + currencyCode + hashedPassword
    : orderId + terminalId + amount + currencyCode + hashedPassword;

  return sha512(hashString);
}
