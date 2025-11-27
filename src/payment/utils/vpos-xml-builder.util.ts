import * as xml2js from 'xml2js';
import { getVposMode, formatCardExpireDate, getProvUserId, getMotoInd } from './vpos-helpers.util';

/**
 * VPOS XML Builder
 * 
 * Garanti VPOS için XML request oluşturma işlemlerini yönetir
 */

/**
 * XML Builder instance'ı oluşturur
 * @returns xml2js.Builder XML Builder
 */
export function createXmlBuilder(): xml2js.Builder {
  return new xml2js.Builder({
    rootName: 'GVPSRequest',
    xmldec: { version: '1.0', encoding: 'iso-8859-9' },
  });
}

/**
 * XML Parser instance'ı oluşturur
 * @returns xml2js.Parser XML Parser
 */
export function createXmlParser(): xml2js.Parser {
  return new xml2js.Parser({ explicitArray: false });
}

/**
 * 3D Secure için form verisi oluşturur
 */
export function build3DSecureFormData(params: {
  orderId: string;
  hashData: string;
  paymentConfig: any;
  amount: number;
  transactionType: string;
  currencyCode: string;
  installmentCount: number;
  customerEmail: string;
  customerIp: string;
  companyName: string;
  cardInfo?: {
    cardholderName: string;
    cardNumber: string;
    cardExpireMonth: string;
    cardExpireYear: string;
    cardCvv2: string;
  } | null;
}): any {
  const {
    orderId,
    hashData,
    paymentConfig,
    amount,
    transactionType,
    currencyCode,
    installmentCount,
    customerEmail,
    customerIp,
    companyName,
    cardInfo,
  } = params;

  const formData: any = {
    mode: getVposMode(),
    apiversion: paymentConfig.apiVersion,
    secure3dsecuritylevel: paymentConfig.securityLevel,
    terminalprovuserid: paymentConfig.provisionUserId,
    terminaluserid: paymentConfig.terminalUserId,
    terminalmerchantid: paymentConfig.merchantId,
    terminalid: paymentConfig.terminalId,
    orderid: orderId,
    successurl: paymentConfig.successUrl,
    errorurl: paymentConfig.errorUrl,
    customeremailaddress: customerEmail,
    customeripaddress: customerIp,
    companyname: companyName,
    lang: 'tr',
    txntimestamp: new Date().toISOString(),
    refreshtime: '1',
    secure3dhash: hashData,
    txnamount: amount,
    txntype: transactionType,
    txncurrencycode: currencyCode,
    txninstallmentcount: installmentCount || '',
  };

  // Kart bilgileri ekle
  if (cardInfo) {
    Object.assign(formData, {
      cardholdername: cardInfo.cardholderName,
      cardnumber: cardInfo.cardNumber,
      cardexpiredatemonth: cardInfo.cardExpireMonth,
      cardexpiredateyear: cardInfo.cardExpireYear,
      cardcvv2: cardInfo.cardCvv2,
    });
  }

  return formData;
}

/**
 * Direct Payment için XML request oluşturur
 */
export function buildDirectPaymentXml(params: {
  orderId: string;
  hashData: string;
  paymentConfig: any;
  amount: number;
  transactionType: string;
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
  provUserID?: string;
}): string {
  const {
    orderId,
    hashData,
    paymentConfig,
    amount,
    transactionType,
    currencyCode,
    customerEmail,
    customerIp,
    cardInfo,
    isRefund,
    provUserID,
  } = params;

  const requestData: any = {
    Mode: getVposMode(),
    Version: paymentConfig.apiVersion,
    Terminal: {
      ProvUserID: provUserID || getProvUserId(isRefund, paymentConfig.provisionUserId),
      HashData: hashData,
      UserID: paymentConfig.terminalUserId,
      ID: paymentConfig.terminalId,
      MerchantID: paymentConfig.merchantId,
    },
    Customer: {
      IPAddress: customerIp,
      EmailAddress: customerEmail,
    },
    Order: {
      OrderID: orderId,
      GroupID: '',
    },
    Transaction: {
      Type: transactionType,
      Amount: amount,
      CurrencyCode: currencyCode,
      CardholderPresentCode: '0',
      MotoInd: getMotoInd(isRefund),
    },
  };

  // Sadece sales/preauth için Card bilgisi ekle
  if (!isRefund && cardInfo) {
    requestData.Card = {
      Number: cardInfo.cardNumber,
      ExpireDate: formatCardExpireDate(cardInfo.cardExpireMonth, cardInfo.cardExpireYear),
      CVV2: cardInfo.cardCvv2,
    };
  }

  const xmlBuilder = createXmlBuilder();
  return xmlBuilder.buildObject(requestData);
}

/**
 * XML string'i parse eder
 */
export async function parseXmlResponse(xmlString: string): Promise<any> {
  const parser = createXmlParser();
  return await parser.parseStringPromise(xmlString);
}

