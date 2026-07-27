/**
 * Detección de dirección por GPS para los formularios de dirección/facturación.
 * Flujo: permiso de ubicación → posición actual → geocodificación inversa
 * (Nominatim / OpenStreetMap, sin API key) → campos normalizados del form.
 */

import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { COUNTRIES } from '../components/molecules/CountrySelect/CountrySelect';

export interface DetectedAddress {
  /** Nombre de país como figura en COUNTRIES (compatible con el picker). */
  country: string;
  /** Calle y número. */
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
}

/** El usuario rechazó el permiso (o está deshabilitado en ajustes). */
export class LocationPermissionDeniedError extends Error {
  constructor() {
    super('Location permission denied');
    this.name = 'LocationPermissionDeniedError';
  }
}

const POSITION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 60000,
} as const;

/** Código de error del callback de geolocalización cuando no hay permiso. */
const GEO_ERROR_PERMISSION_DENIED = 1;

async function ensureAndroidPermission(): Promise<void> {
  if (Platform.OS !== 'android') {
    // iOS: getCurrentPosition dispara el prompt del sistema automáticamente
    // (NSLocationWhenInUseUsageDescription); el rechazo llega como error code 1.
    return;
  }
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  );
  if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new LocationPermissionDeniedError();
  }
}

function getCurrentCoords(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => {
        if (err.code === GEO_ERROR_PERMISSION_DENIED) {
          reject(new LocationPermissionDeniedError());
        } else {
          reject(new Error(err.message || 'Location unavailable'));
        }
      },
      POSITION_OPTIONS
    );
  });
}

interface NominatimAddress {
  house_number?: string;
  road?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  province?: string;
  region?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

async function reverseGeocode(latitude: number, longitude: number): Promise<NominatimAddress> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${latitude}&lon=${longitude}&addressdetails=1`;
  const res = await fetch(url, {
    headers: {
      // Requerido por la política de uso de Nominatim.
      'User-Agent': 'PulpoLive/1.0 (soporte@pulpolive.com)',
      'Accept-Language': 'es',
    },
  });
  if (!res.ok) {
    throw new Error(`Reverse geocode failed: ${res.status}`);
  }
  const data = await res.json();
  return (data?.address ?? {}) as NominatimAddress;
}

function toCountryName(addr: NominatimAddress): string {
  const code = addr.country_code?.toUpperCase();
  if (code) {
    const match = COUNTRIES.find((c) => c.code === code);
    if (match) return match.name;
  }
  return addr.country ?? '';
}

/**
 * Pide permiso, obtiene la posición y la traduce a campos de dirección.
 * Lanza LocationPermissionDeniedError si el usuario no otorga el permiso.
 */
export async function detectCurrentAddress(): Promise<DetectedAddress> {
  await ensureAndroidPermission();
  const { latitude, longitude } = await getCurrentCoords();
  const addr = await reverseGeocode(latitude, longitude);
  return {
    country: toCountryName(addr),
    addressLine: [addr.road, addr.house_number].filter(Boolean).join(' ').trim(),
    city: addr.city || addr.town || addr.village || addr.municipality || '',
    state: addr.state || addr.province || addr.region || '',
    postalCode: addr.postcode || '',
  };
}
