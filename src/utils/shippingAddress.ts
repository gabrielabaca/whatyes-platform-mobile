/**
 * Criterio único de "¿el usuario tiene dirección de envío usable?".
 *
 * Había dos definiciones incompatibles (una pedía nombre + calle + país, la otra
 * calle + CP): una dirección sin código postal pasaba la primera y fallaba la
 * segunda. Gana el criterio estricto, que es lo que el backend necesita de verdad:
 * sin CP no hay cotización de MG ni guía de envío.
 */
import type { ShippingAddress } from '../api/shippingAddressApi';

export function hasUsableShippingAddress(
  address: ShippingAddress | null | undefined
): boolean {
  return Boolean(address?.address_line1?.trim() && address?.postal_code?.trim());
}

/** La elegida; si por datos viejos ninguna está marcada, la primera de la lista. */
export function pickDefaultShippingAddress(
  addresses: ShippingAddress[]
): ShippingAddress | null {
  return addresses.find((a) => a.is_default) ?? addresses[0] ?? null;
}

/** Dirección en una línea, como la muestra el selector: calle, ciudad, provincia, país. */
export function formatShippingAddressLine(address: ShippingAddress): string {
  return [
    address.address_line1?.trim(),
    address.city?.trim(),
    address.state?.trim(),
    address.country?.trim(),
  ]
    .filter(Boolean)
    .join(', ');
}
