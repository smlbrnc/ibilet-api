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
      fareRules: '/productservice/getfarerules',
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
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
});

