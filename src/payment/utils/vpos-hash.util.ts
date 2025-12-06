/**
 * Garanti VPOS Hash Hesaplama - 3D Secure İLE (3D_PAY)
 */

import { sha512, getHashedPassword } from './hash-common.util';

interface Hash3DSecureParams {
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
}

/**
 * 3D Secure ile hash değeri hesaplama
 */
export function getHashData(params: Hash3DSecureParams): string {
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

  const hashedPassword = getHashedPassword(provisionPassword, terminalId);

  // Hash sırası: terminalId + orderId + amount + currencyCode + successUrl + errorUrl + type + installmentCount + storeKey + hashedPassword
  const hashString =
    String(terminalId) +
    String(orderId) +
    String(Math.round(amount)) +
    String(currencyCode) +
    String(successUrl) +
    String(errorUrl) +
    String(type) +
    String(installmentCount) +
    String(storeKey) +
    String(hashedPassword);

  return sha512(hashString);
}
