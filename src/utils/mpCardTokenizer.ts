/**
 * Tokenización de tarjeta contra la API pública de Mercado Pago (Métodos Core vía
 * REST, con public key). Reemplaza al WebView del formulario: los campos pasan a ser
 * nativos y el PAN viaja una sola vez, del dispositivo a MP — nunca al backend propio.
 *
 * Son los mismos endpoints que usa el SDK JS por debajo:
 *  - GET  /v1/payment_methods/search?bin=…  → detectar marca/emisor
 *  - POST /v1/card_tokens                    → crear el token de un solo uso
 */

const MP_API = 'https://api.mercadopago.com';

/** Error de la API de tokenización, con los códigos de `cause` para mapear a i18n. */
export class MpCardTokenError extends Error {
  codes: string[];

  constructor(message: string, codes: string[] = []) {
    super(message);
    this.name = 'MpCardTokenError';
    this.codes = codes;
  }
}

export interface DetectedPaymentMethod {
  id: string;
  issuerId: string | null;
  /** Isologo oficial de la marca servido por MP; null si la respuesta no lo trae. */
  secureThumbnail: string | null;
}

export async function detectPaymentMethod(
  publicKey: string,
  bin: string
): Promise<DetectedPaymentMethod | null> {
  // OJO: /v1/payment_methods/search IGNORA el parámetro bin (devuelve la lista
  // completa en un orden fijo — tomar results[0] reportaba "master" para cualquier
  // tarjeta). El endpoint que sí resuelve por BIN es el de cuotas, que además trae
  // el emisor real; el amount es nominal, solo para que la consulta sea válida.
  const params = `public_key=${encodeURIComponent(publicKey)}&bin=${encodeURIComponent(bin)}&amount=100`;
  const res = await fetch(`${MP_API}/v1/payment_methods/installments?${params}`);
  const data = (await res.json().catch(() => null)) as
    | {
        payment_method_id?: string;
        issuer?: { id?: string | number };
        secure_thumbnail?: string;
      }[]
    | null;
  const first = res.ok && Array.isArray(data) ? data[0] : undefined;
  if (!first?.payment_method_id) return null;
  return {
    id: String(first.payment_method_id),
    issuerId: first.issuer?.id != null ? String(first.issuer.id) : null,
    // Solo secure_thumbnail (https): el `thumbnail` http lo bloquea ATS en iOS.
    secureThumbnail: first.secure_thumbnail?.trim() || null,
  };
}

export interface MpCardTokenInput {
  cardNumber: string;
  cardholderName: string;
  expirationMonth: number;
  expirationYear: number;
  securityCode: string;
  identificationType: string;
  identificationNumber: string;
}

export interface MpCardToken {
  id: string;
  lastFour: string | null;
}

export async function createMpCardToken(
  publicKey: string,
  input: MpCardTokenInput
): Promise<MpCardToken> {
  const res = await fetch(
    `${MP_API}/v1/card_tokens?public_key=${encodeURIComponent(publicKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_number: input.cardNumber,
        security_code: input.securityCode,
        expiration_month: input.expirationMonth,
        expiration_year: input.expirationYear,
        cardholder: {
          name: input.cardholderName,
          identification: {
            type: input.identificationType,
            number: input.identificationNumber,
          },
        },
      }),
    }
  );
  const data = (await res.json().catch(() => ({}))) as {
    id?: string | number;
    last_four_digits?: string | number;
    message?: string;
    cause?: { code?: string | number; description?: string }[];
  };
  if (!res.ok || data.id == null) {
    const causes = Array.isArray(data.cause) ? data.cause : [];
    const codes = causes.map((c) => String(c.code ?? ''));
    const message =
      causes.map((c) => c.description).filter(Boolean).join(' ') ||
      data.message ||
      'No se pudo validar la tarjeta';
    throw new MpCardTokenError(message, codes);
  }
  return {
    id: String(data.id),
    lastFour: data.last_four_digits != null ? String(data.last_four_digits) : null,
  };
}
