/**
 * VPOS Response Parser
 *
 * VPOS'tan gelen yanıtları parse eder ve formatlar
 */

import {
  maskCardNumber,
  isTransactionSuccessful,
  convertToMajorUnits,
  getTransactionMessage,
} from './vpos-helpers.util';

/**
 * Garanti VPOS Transaction Response'unu parse eder
 */
export function parseTransactionResponse(transaction: any): {
  responseObj: any;
  responseCode: string | null;
  responseMessage: string | null;
  isSuccess: boolean;
} {
  // Response objesi veya string olabilir
  const responseObj = typeof transaction.Response === 'object' ? transaction.Response : null;
  const responseCode = responseObj ? responseObj.ReasonCode : transaction.ReasonCode;
  const responseMessage = responseObj ? responseObj.Message : transaction.Response;

  return {
    responseObj,
    responseCode,
    responseMessage,
    isSuccess: isTransactionSuccessful(responseCode, responseMessage),
  };
}

/**
 * Direct Payment yanıtını formatlar
 */
export function formatDirectPaymentResponse(params: {
  transaction: any;
  orderId: string;
  transactionType: string;
  amount: number;
  currencyCode: string;
  customerEmail: string;
  customerIp: string;
  cardInfo?: {
    cardholderName: string;
    cardNumber: string;
    cardExpireMonth: string;
    cardExpireYear: string;
    cardCvv2: string;
  } | null;
  isRefund: boolean;
}): any {
  const {
    transaction,
    orderId,
    transactionType,
    amount,
    currencyCode,
    customerEmail,
    customerIp,
    cardInfo,
    isRefund,
  } = params;

  const parsed = parseTransactionResponse(transaction);
  const { responseObj, responseCode, responseMessage, isSuccess } = parsed;

  // Hata mesajını belirle
  const errorMessage =
    responseObj?.ErrorMsg ||
    responseObj?.SysErrMsg ||
    transaction.ErrorMsg ||
    transaction.SysErrMsg ||
    'İşlem başarısız';

  return {
    success: isSuccess,
    orderId,
    transactionType,
    transaction: {
      status: responseMessage,
      returnCode: responseCode,
      authCode: transaction.AuthCode || null,
      hostRefNum: transaction.RetrefNum || transaction.HostRefNum || null,
      amount: convertToMajorUnits(amount),
      currencyCode,
      message: isSuccess ? getTransactionMessage(isRefund, isSuccess) : errorMessage,
    },
    paymentDetails: {
      hostRefNum: transaction.RetrefNum || transaction.HostRefNum || null,
      maskedPan:
        transaction.CardNumberMasked || (cardInfo ? maskCardNumber(cardInfo.cardNumber) : null),
      cardholderName: transaction.CardHolderName || cardInfo?.cardholderName || null,
      transactionTimestamp: new Date().toISOString(),
      customerIpAddress: customerIp,
      customerEmail,
      amountInMinorUnits: amount,
      currencyCode,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 3D Secure Callback yanıtını formatlar
 */
export function format3DSecureCallbackResponse(callbackData: any): any {
  const {
    response,
    procreturncode,
    oid,
    authcode,
    errmsg,
    txnamount,
    txncurrencycode,
    mderrormessage,
    hostrefnum,
    MaskedPan,
    cardholdername,
    txntimestamp,
    customeripaddress,
  } = callbackData;

  const isSuccess = response === 'Approved' && procreturncode === '00';

  return {
    success: isSuccess,
    orderId: oid,
    transaction: {
      status: response,
      returnCode: procreturncode,
      authCode: authcode,
      amount: txnamount ? convertToMajorUnits(txnamount) : null,
      currencyCode: txncurrencycode,
      message: isSuccess
        ? 'İşlem başarıyla tamamlandı'
        : errmsg || mderrormessage || 'İşlem başarısız',
    },
    paymentDetails: {
      hostRefNum: hostrefnum || null,
      maskedPan: MaskedPan || null,
      cardholderName: cardholdername || null,
      transactionTimestamp: txntimestamp || null,
      customerIpAddress: customeripaddress || null,
      amountInMinorUnits: txnamount || null,
      currencyCode: txncurrencycode || null,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 3D Secure Payment başlatma yanıtını formatlar
 */
export function format3DSecurePaymentResponse(params: {
  orderId: string;
  formData: any;
  redirectUrl: string;
}): any {
  const { orderId, formData, redirectUrl } = params;

  return {
    orderId,
    formData,
    redirectUrl,
  };
}
