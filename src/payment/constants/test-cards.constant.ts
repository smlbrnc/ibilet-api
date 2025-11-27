/**
 * Garanti BBVA Test Kartları
 * Tüm test kartları için 3D Secure OTP kodu: 147852
 */

export interface TestCard {
  type: string;
  number: string;
  cvv: string;
  expireMonth: string;
  expireYear: string;
  cardholderName: string;
  otp: string;
  description?: string;
}

export const TEST_CARDS: TestCard[] = [
  {
    type: 'TROY',
    number: '9792052565200015',
    cvv: '327',
    expireMonth: '01',
    expireYear: '27',
    cardholderName: 'Test User',
    otp: '147852',
    description: 'TROY test kartı',
  },
  {
    type: 'BONUS',
    number: '5406697543211173',
    cvv: '423',
    expireMonth: '04',
    expireYear: '27',
    cardholderName: 'Mehmet Daldeviren',
    otp: '147852',
    description: 'BONUS test kartı',
  },
  {
    type: 'BONUS',
    number: '5549603469426017',
    cvv: '916',
    expireMonth: '01',
    expireYear: '27',
    cardholderName: 'Test User',
    otp: '147852',
    description: 'BONUS test kartı (alternatif)',
  },
  {
    type: 'VISA',
    number: '4282209004348015',
    cvv: '123',
    expireMonth: '08',
    expireYear: '27',
    cardholderName: 'Test User',
    otp: '147852',
    description: 'VISA test kartı',
  },
  {
    type: 'AMEX',
    number: '375624000001036',
    cvv: '3041',
    expireMonth: '04',
    expireYear: '26',
    cardholderName: 'Test User',
    otp: '147852',
    description: 'AMEX test kartı',
  },
];

/**
 * Test kartı numarasına göre kart bilgisini getirir
 */
export function getTestCardByNumber(cardNumber: string): TestCard | undefined {
  return TEST_CARDS.find((card) => card.number === cardNumber);
}

/**
 * Test kartı tipine göre kart bilgisini getirir
 */
export function getTestCardByType(type: string): TestCard | undefined {
  return TEST_CARDS.find((card) => card.type === type);
}

