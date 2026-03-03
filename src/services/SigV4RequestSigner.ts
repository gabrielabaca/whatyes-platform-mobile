import CryptoJS from 'crypto-js';

type Credentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

export class SigV4RequestSigner {
  static DEFAULT_ALGORITHM = 'AWS4-HMAC-SHA256';
  static DEFAULT_SERVICE = 'kinesisvideo';

  private region: string;
  private credentials: Credentials;
  private service: string;

  constructor(region: string, credentials: Credentials, service = SigV4RequestSigner.DEFAULT_SERVICE) {
    this.region = region;
    this.credentials = credentials;
    this.service = service;
  }

  getSignedURL(endpoint: string, queryParams: Record<string, string>, date: Date = new Date()): string {
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

    const canonicalQueryParams: Record<string, string> = {
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

  private static createQueryString(queryParams: Record<string, string>): string {
    return Object.keys(queryParams)
      .sort()
      .map((key) => `${key}=${encodeURIComponent(queryParams[key])}`)
      .join('&');
  }

  private static getDateTimeString(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[:\-]/g, '');
  }

  private static getDateString(date: Date): string {
    return this.getDateTimeString(date).substring(0, 8);
  }

  private static sha256(message: string): string {
    return CryptoJS.SHA256(message).toString(CryptoJS.enc.Hex);
  }

  private static hmac(key: CryptoJS.lib.WordArray, message: string): string {
    return CryptoJS.HmacSHA256(message, key).toString(CryptoJS.enc.Hex);
  }

  private static getSignatureKey(
    dateString: string,
    region: string,
    service: string,
    secretAccessKey: string
  ): CryptoJS.lib.WordArray {
    const kDate = CryptoJS.HmacSHA256(dateString, `AWS4${secretAccessKey}`);
    const kRegion = CryptoJS.HmacSHA256(region, kDate);
    const kService = CryptoJS.HmacSHA256(service, kRegion);
    return CryptoJS.HmacSHA256('aws4_request', kService);
  }
}
