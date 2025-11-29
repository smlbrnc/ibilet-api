export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiUrl: process.env.API_URL,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || [],
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },
  pax: {
    baseUrl: process.env.PAX_BASE_URL,
    agency: process.env.PAX_AGENCY,
    user: process.env.PAX_USER,
    password: process.env.PAX_PASSWORD,
    endpoints: {
      auth: '/authenticationservice/login',
      departure: '/productservice/getdepartureautocomplete',
      arrival: '/productservice/getarrivalautocomplete',
      checkinDates: '/productservice/getcheckindates',
      priceSearch: '/productservice/pricesearch',
      getOffers: '/productservice/getoffers',
      productInfo: '/productservice/getproductinfo',
      offerDetails: '/productservice/getofferdetails',
      fareRules: '/flightservice/getfarerules',
      beginTransaction: '/bookingservice/begintransaction',
      addServices: '/bookingservice/addservices',
      removeServices: '/bookingservice/removeservices',
      setReservationInfo: '/bookingservice/setreservationinfo',
      commitTransaction: '/bookingservice/committransaction',
      reservationDetail: '/bookingservice/getreservationdetail',
      reservationList: '/bookingservice/getreservationlist',
      cancellationPenalty: '/bookingservice/getcancellationpenalty',
      cancelReservation: '/bookingservice/cancelreservation',
    },
  },
  foursquare: {
    baseUrl: process.env.FOURSQUARE_BASE_URL,
    apiKey: process.env.FOURSQUARE_API_KEY,
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL || 'İbilet <noreply@mail.ibilet.com>',
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  payment: {
    // Production credentials - Config.env'den alınacak
    merchantId: process.env.PAYMENT_MERCHANT_ID,
    terminalId: process.env.PAYMENT_TERMINAL_ID,
    storeKey: process.env.PAYMENT_STORE_KEY,
    provisionPassword: process.env.PAYMENT_PROVISION_PASSWORD,
    provisionUserId: process.env.PAYMENT_PROVISION_USER_ID || 'PROVAUT',
    terminalUserId: process.env.PAYMENT_TERMINAL_USER_ID,
    terminalJwkKeyProvizyon: process.env.PAYMENT_TERMINAL_JWKKEY_PROVIZYON,
    // Test credentials - Config.env'den alınacak
    testMerchantId: process.env.PAYMENT_TEST_MERCHANT_ID,
    testTerminalId: process.env.PAYMENT_TEST_TERMINAL_ID,
    testStoreKey: process.env.PAYMENT_TEST_STORE_KEY,
    testProvisionPassword: process.env.PAYMENT_TEST_PROVISION_PASSWORD,
    testProvisionUserId: process.env.PAYMENT_TEST_PROVISION_USER_ID || 'PROVAUT',
    testTerminalUserId: process.env.PAYMENT_TEST_TERMINAL_USER_ID,
    testTerminalJwkKeyProvizyon: process.env.PAYMENT_TEST_TERMINAL_JWKKEY_PROVIZYON,
    // Common URLs - API_URL kullanılarak dinamik oluşturulacak
    callbackBaseUrl: process.env.API_URL,
    successUrl: process.env.API_URL ? `${process.env.API_URL}/payment/callback` : undefined,
    errorUrl: process.env.API_URL ? `${process.env.API_URL}/payment/callback` : undefined,
    // Frontend redirect URL - Ödeme sonrası yönlendirme (mobil ve web için)
    redirectUrl: process.env.PAYMENT_REDIRECT_URL,
  },
});

