/**
 * Social Auth (SSO) — envoltorio de los SDK nativos de Google y Apple.
 *
 * Devuelve el `idToken`/`identityToken` que el backend (service-users) verifica
 * en POST /auth/social_login. El nombre solo lo aporta el SDK (Apple lo entrega
 * únicamente en la primera autorización y fuera del token).
 */
import { Platform } from 'react-native';
import Config from 'react-native-config';
import {
  GoogleSignin,
  statusCodes,
  isSuccessResponse,
  isErrorWithCode,
} from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';

/** El usuario canceló el diálogo del proveedor: no es un error a mostrar. */
export class SocialAuthCancelledError extends Error {
  constructor() {
    super('cancelled');
    this.name = 'SocialAuthCancelledError';
  }
}

/** Falla real del flujo social (config, red, Play Services, etc.). */
export class SocialAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SocialAuthError';
  }
}

export interface SocialCredential {
  idToken: string;
  name?: string;
  lastName?: string;
}

let googleConfigured = false;

/** Configura GoogleSignin una sola vez (idempotente). */
function configureGoogleSignin(): void {
  if (googleConfigured) {
    return;
  }
  const webClientId = Config.GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    throw new SocialAuthError(
      'GOOGLE_WEB_CLIENT_ID no está configurado (.env de platform_mobile).'
    );
  }
  GoogleSignin.configure({
    // webClientId: OAuth 2.0 "Web" client ID; imprescindible para recibir idToken.
    webClientId,
    // iosClientId: opcional si se usa GoogleService-Info.plist; recomendado explícito.
    iosClientId: Config.GOOGLE_IOS_CLIENT_ID || undefined,
    offlineAccess: false,
    scopes: ['email', 'profile'],
  });
  googleConfigured = true;
}

export async function signInWithGoogle(): Promise<SocialCredential> {
  configureGoogleSignin();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      // El usuario cerró el diálogo sin elegir cuenta.
      throw new SocialAuthCancelledError();
    }

    const { idToken, user } = response.data;
    if (!idToken) {
      throw new SocialAuthError(
        'Google no devolvió idToken; revisa webClientId (client "Web").'
      );
    }
    return {
      idToken,
      name: user.givenName || user.name || undefined,
      lastName: user.familyName || undefined,
    };
  } catch (error) {
    if (error instanceof SocialAuthCancelledError || error instanceof SocialAuthError) {
      throw error;
    }
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new SocialAuthCancelledError();
      }
      if (error.code === statusCodes.IN_PROGRESS) {
        throw new SocialAuthError('Ya hay un inicio de sesión de Google en curso.');
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new SocialAuthError('Google Play Services no está disponible o desactualizado.');
      }
    }
    throw new SocialAuthError(
      (error as Error)?.message || 'No se pudo iniciar sesión con Google.'
    );
  }
}

/** Apple Sign In solo está disponible en iOS 13+. */
export function isAppleSignInSupported(): boolean {
  return Platform.OS === 'ios' && appleAuth.isSupported;
}

export async function signInWithApple(): Promise<SocialCredential> {
  if (!isAppleSignInSupported()) {
    throw new SocialAuthError('Sign in with Apple no está disponible en este dispositivo.');
  }
  try {
    const response = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
    });

    const { identityToken, fullName } = response;
    if (!identityToken) {
      throw new SocialAuthError('Apple no devolvió identityToken.');
    }
    return {
      idToken: identityToken,
      name: fullName?.givenName || undefined,
      lastName: fullName?.familyName || undefined,
    };
  } catch (error) {
    if (error instanceof SocialAuthError) {
      throw error;
    }
    if ((error as { code?: string })?.code === appleAuth.Error.CANCELED) {
      throw new SocialAuthCancelledError();
    }
    throw new SocialAuthError(
      (error as Error)?.message || 'No se pudo iniciar sesión con Apple.'
    );
  }
}
