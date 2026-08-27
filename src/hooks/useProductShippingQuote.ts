/**
 * Cotización de envío del producto activo del vivo hacia el domicilio del usuario.
 *
 * Obtiene el código postal del domicilio guardado (service-users) y cotiza contra
 * service-platform, que resuelve peso + dimensiones del paquete y el envío
 * combinado/gratis con compras previas del mismo vivo. Se recotiza al cambiar el
 * producto activo y al guardar/actualizar el domicilio (llamar `refresh()`).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getProductShippingQuote,
  type ProductShippingQuoteResponse,
} from '../api/platformApi';
import { listShippingAddresses, type ShippingAddress } from '../api/shippingAddressApi';
import { pickDefaultShippingAddress } from '../utils/shippingAddress';
import { storage } from '../utils/storage';

export type ShippingQuoteState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'quoted'; priceCents: number; currency: string; estimatedDays: number | null }
  | { status: 'free' }
  | { status: 'address_required' }
  | { status: 'unavailable' };

export interface UseProductShippingQuoteParams {
  roomId: string;
  productId: string | null | undefined;
}

export function useProductShippingQuote({ roomId, productId }: UseProductShippingQuoteParams) {
  const [quote, setQuote] = useState<ShippingQuoteState>({ status: 'idle' });
  // Domicilio de envío del comprador (para el drawer de tasas de envío).
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  // Dirección del vendedor para retiro en persona (sección "Retirar Compra").
  const [sellerPickupAddress, setSellerPickupAddress] = useState<string | null>(null);
  // Epoch para invalidar respuestas viejas cuando cambia el producto o se refresca.
  const requestEpochRef = useRef(0);

  const fetchQuote = useCallback(async () => {
    if (!roomId || !productId) {
      setQuote({ status: 'idle' });
      return;
    }
    const epoch = ++requestEpochRef.current;
    setQuote({ status: 'loading' });
    try {
      const token = await storage.getAccessToken();
      if (!token) {
        if (requestEpochRef.current === epoch) setQuote({ status: 'unavailable' });
        return;
      }
      let cpDestino: string | null = null;
      try {
        const addresses = await listShippingAddresses(token);
        const address = pickDefaultShippingAddress(addresses);
        cpDestino = address?.postal_code?.trim() || null;
        if (requestEpochRef.current === epoch) setShippingAddress(address);
      } catch {
        // Sin domicilio guardado: el backend igual puede responder free (combinado)
        // o address_required.
        if (requestEpochRef.current === epoch) setShippingAddress(null);
      }
      const data: ProductShippingQuoteResponse = await getProductShippingQuote(
        token,
        roomId,
        productId,
        cpDestino
      );
      if (requestEpochRef.current !== epoch) return;
      setSellerPickupAddress(data.seller_pickup_address?.trim() || null);
      switch (data.status) {
        case 'free':
          setQuote({ status: 'free' });
          break;
        case 'quoted':
          setQuote({
            status: 'quoted',
            priceCents: data.price_cents ?? 0,
            currency: data.currency || 'ARS',
            estimatedDays: data.estimated_days ?? null,
          });
          break;
        case 'address_required':
          setQuote({ status: 'address_required' });
          break;
        default:
          setQuote({ status: 'unavailable' });
      }
    } catch {
      if (requestEpochRef.current === epoch) setQuote({ status: 'unavailable' });
    }
  }, [roomId, productId]);

  useEffect(() => {
    void fetchQuote();
  }, [fetchQuote]);

  return { quote, shippingAddress, sellerPickupAddress, refresh: fetchQuote };
}
