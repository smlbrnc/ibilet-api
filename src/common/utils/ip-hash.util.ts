import * as crypto from 'crypto';

/**
 * IP Hash Utility - KVKK Uyumluluğu için
 * Raw IP adreslerini hash'leyerek saklar
 */

// Salt değeri (environment variable'dan alınabilir, şimdilik sabit)
const IP_HASH_SALT = process.env.IP_HASH_SALT || 'ibilet-cookie-consent-salt-2025';

/**
 * IP adresini hash'ler (KVKK uyumluluğu için)
 * @param ip - Raw IP adresi
 * @returns Hash'lenmiş IP adresi (SHA-256)
 */
export function hashIpAddress(ip: string): string {
  if (!ip || ip === 'unknown' || ip === '::1' || ip === '127.0.0.1') {
    // Localhost için özel hash
    return crypto.createHash('sha256').update(`${IP_HASH_SALT}:localhost`).digest('hex');
  }

  // Salt + IP ile hash oluştur
  const hash = crypto.createHash('sha256').update(`${IP_HASH_SALT}:${ip}`).digest('hex');
  return hash;
}

/**
 * IP adresini request'ten alır ve hash'ler
 * @param req - Express Request objesi
 * @returns Hash'lenmiş IP adresi
 */
export function getHashedIpFromRequest(req: any): string {
  // IP adresini al (proxy/load balancer desteği ile)
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.ip ||
    req.socket?.remoteAddress ||
    'unknown';

  return hashIpAddress(ip);
}

