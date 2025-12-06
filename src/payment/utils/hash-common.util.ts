/**
 * Ortak Hash Fonksiyonları
 */

import * as crypto from 'crypto';

/** SHA1 hash (ISO-8859-9 charset ile) */
export const sha1 = (data: string): string =>
  crypto.createHash('sha1').update(data, 'latin1').digest('hex').toUpperCase();

/** SHA512 hash (ISO-8859-9 charset ile) */
export const sha512 = (data: string): string =>
  crypto.createHash('sha512').update(data, 'latin1').digest('hex').toUpperCase();

/** HashedPassword hesaplama */
export const getHashedPassword = (password: string, terminalId: string): string =>
  sha1(password + '0' + terminalId);
