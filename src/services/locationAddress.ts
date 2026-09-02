/**
 * Detección de dirección por GPS para los formularios de dirección/facturación.
 * Flujo: permiso de ubicación → posición actual → geocodificación inversa
 * (Geoapify, vía service-platform → service_delivery) → campos del form.
 *
 * DetectedAddress no cambia: los consumidores siguen igual.
 */

import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { COUNTRIES } from '../components/molecules/CountrySelect/CountrySelect';
import { reverseGeocodeAddress, type AddressSuggestion } from '../api/platformApi';
import { storage } from '../utils/storage';

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

function toCountryName(suggestion: AddressSuggestion): string {
  const code = suggestion.country_code?.toUpperCase();
  if (code) {
    const match = COUNTRIES.find((c) => c.code === code);
    if (match) return match.name;
  }
  return suggestion.country ?? '';
}

function toDetectedAddress(suggestion: AddressSuggestion): DetectedAddress {
  return {
    country: toCountryName(suggestion),
    addressLine: suggestion.address_line?.trim() || '',
    city: suggestion.city?.trim() || '',
    state: suggestion.state?.trim() || '',
    postalCode: suggestion.postal_code?.trim() || '',
  };
}

/**
 * Pide permiso, obtiene la posición y la traduce a campos de dirección.
 * Lanza LocationPermissionDeniedError si el usuario no otorga el permiso.
 */
export async function detectCurrentAddress(): Promise<DetectedAddress> {
  await ensureAndroidPermission();
  const { latitude, longitude } = await getCurrentCoords();
  const token = await storage.getAccessToken();
  if (!token) {
    throw new Error('Reverse geocode failed: not authenticated');
  }
  const result = await reverseGeocodeAddress(token, latitude, longitude);
  if (result.status !== 'ok' || !result.address) {
    throw new Error(`Reverse geocode failed: ${result.status}`);
  }
  return toDetectedAddress(result.address);
}
