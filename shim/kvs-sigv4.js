const CryptoJS = require('crypto-js');

class SigV4RequestSigner {
  static DEFAULT_ALGORITHM = 'AWS4-HMAC-SHA256';
  static DEFAULT_SERVICE = 'kinesisvideo';

  constructor(region, credentials, service = SigV4RequestSigner.DEFAULT_SERVICE) {
    this.region = region;
    this.credentials = credentials;
    this.service = service;
  }

  async getSignedURL(endpoint, queryParams, date = new Date()) {
    const datetimeString = SigV4RequestSigner.getDateTimeString(date);
    const dateString = SigV4RequestSigner.getDateString(date);
    const protocol = 'wss';
    const urlProtocol = `${protocol}://`;
    if (!endpoint.startsWith(urlProtocol)) {
      throw new Error(`Endpoint '${endpoint}' is not a secure WebSocket endpoint. It should start with '${urlProtocol}'.`);
    }
    if (endpoint.includes('?')) {
      throw new Error(`Endpoint '${endpoint}' should not contain any query parameters.`);
    }
    const pathStartIndex = endpoint.indexOf('/', urlProtocol.length);
    const host = pathStartIndex < 0 ? endpoint.substring(urlProtocol.length) : endpoint.substring(urlProtocol.length, pathStartIndex);
    const path = pathStartIndex < 0 ? '/' : endpoint.substring(pathStartIndex);

    const signedHeaders = 'host';
    const method = 'GET';
    const credentialScope = `${dateString}/${this.region}/${this.service}/aws4_request`;

    const canonicalQueryParams = {
      ...queryParams,
      'X-Amz-Algorithm': SigV4RequestSigner.DEFAULT_ALGORITHM,
      'X-Amz-Credential': `${this.credentials.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': datetimeString,
      'X-Amz-Expires': '299',
      'X-Amz-SignedHeaders': signedHeaders,
    };
    if (this.credentials.sessionToken) {
      canonicalQueryParams['X-Amz-Security-Token'] = this.credentials.sessionToken;
    }

    const canonicalQueryString = SigV4RequestSigner.createQueryString(canonicalQueryParams);
    const canonicalHeadersString = `host:${host}\n`;
    const payloadHash = SigV4RequestSigner.sha256('');
    const canonicalRequest = [method, path, canonicalQueryString, canonicalHeadersString, signedHeaders, payloadHash].join('\n');
    const canonicalRequestHash = SigV4RequestSigner.sha256(canonicalRequest);
    const stringToSign = [
      SigV4RequestSigner.DEFAULT_ALGORITHM,
      datetimeString,
      credentialScope,
      canonicalRequestHash,
    ].join('\n');

    const signingKey = SigV4RequestSigner.getSignatureKey(dateString, this.region, this.service, this.credentials.secretAccessKey);
    const signature = SigV4RequestSigner.hmac(signingKey, stringToSign);

    const signedQueryParams = {
      ...canonicalQueryParams,
      'X-Amz-Signature': signature,
    };

    return `${protocol}://${host}${path}?${SigV4RequestSigner.createQueryString(signedQueryParams)}`;
  }

  static createQueryString(queryParams) {
    return Object.keys(queryParams)
      .sort()
      .map((key) => `${key}=${encodeURIComponent(queryParams[key])}`)
      .join('&');
  }

  static getDateTimeString(date) {
    return date.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[:\-]/g, '');
  }

  static getDateString(date) {
    return this.getDateTimeString(date).substring(0, 8);
  }

  static sha256(message) {
    return CryptoJS.SHA256(message).toString(CryptoJS.enc.Hex);
  }

  static hmac(key, message) {
    return CryptoJS.HmacSHA256(message, key).toString(CryptoJS.enc.Hex);
  }

  static getSignatureKey(dateString, region, service, secretAccessKey) {
    const kDate = CryptoJS.HmacSHA256(dateString, `AWS4${secretAccessKey}`);
    const kRegion = CryptoJS.HmacSHA256(region, kDate);
    const kService = CryptoJS.HmacSHA256(service, kRegion);
    return CryptoJS.HmacSHA256('aws4_request', kService);
  }
}

module.exports = { SigV4RequestSigner };
