export interface ParsedUserAgent {
  device: string;
  browser: string;
  os: string;
  isMobile: boolean;
}

export function parseUserAgent(userAgent: string | null): ParsedUserAgent {
  if (!userAgent) {
    return { device: 'Bilinmeyen', browser: 'Bilinmeyen', os: 'Bilinmeyen', isMobile: false };
  }

  const ua = userAgent.toLowerCase();

  // Cihaz ve OS tespiti
  let device = 'Bilinmeyen';
  let os = 'Bilinmeyen';
  let isMobile = false;

  if (ua.includes('iphone')) {
    device = 'iPhone';
    os = 'iOS';
    isMobile = true;
  } else if (ua.includes('ipad')) {
    device = 'iPad';
    os = 'iPadOS';
    isMobile = true;
  } else if (ua.includes('android')) {
    device = ua.includes('mobile') ? 'Android Phone' : 'Android Tablet';
    os = 'Android';
    isMobile = true;
  } else if (ua.includes('macintosh') || ua.includes('mac os')) {
    device = 'Mac';
    os = 'macOS';
  } else if (ua.includes('windows')) {
    device = 'Windows PC';
    os = 'Windows';
  } else if (ua.includes('linux')) {
    device = 'Linux PC';
    os = 'Linux';
  }

  // iBilet App tespiti
  if (ua.includes('ibilet')) {
    device = isMobile ? (ua.includes('iphone') || ua.includes('ipad') ? 'iOS-Device' : 'Android-Device') : device;
    return { device, browser: 'iBilet App', os, isMobile };
  }

  // Tarayıcı tespiti
  let browser = 'Bilinmeyen';

  if (ua.includes('edg/') || ua.includes('edge/')) {
    browser = 'Edge';
  } else if (ua.includes('opr/') || ua.includes('opera')) {
    browser = 'Opera';
  } else if (ua.includes('chrome') && !ua.includes('chromium')) {
    browser = isMobile ? 'Chrome Mobile' : 'Chrome';
    if (ua.includes('crios')) browser = 'Chrome Mobile iOS';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = isMobile ? 'Safari Mobile' : 'Safari';
  } else if (ua.includes('firefox') || ua.includes('fxios')) {
    browser = isMobile ? 'Firefox Mobile' : 'Firefox';
  }

  return { device, browser, os, isMobile };
}

export function formatSessionDisplay(parsed: ParsedUserAgent): string {
  return `${parsed.device} · ${parsed.browser}`;
}

