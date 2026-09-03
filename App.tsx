/**
 * PulpoLive App
 * React Native App with NativeWind and Atomic Design
 *
 * @format
 */

import './global.css';
import React, { useState, useEffect, useRef } from 'react';
import { StatusBar, Linking, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { InterestCategoriesProvider } from './src/context/InterestCategoriesContext';
import { OverlayPortalProvider } from './src/context/OverlayPortalContext';
import { StartLiveWizardProvider, useStartLiveWizard } from './src/hooks/useStartLiveWizard';
import { StartLiveWizardHost } from './src/components/organisms/startLive/StartLiveWizardHost';
import { AlertProvider, appAlert } from './src/alerts';
import { storage } from './src/utils/storage';
import { isBuyerKycReturnUrl, notifyBuyerKycReturn } from './src/utils/buyerKycDeepLink';
import { isMpWalletReturnUrl, notifyMpWalletReturn } from './src/utils/mpWalletDeepLink';
import {
  destinationFromDeepLink,
  isNotificationDeepLink,
} from './src/utils/notificationDeepLink';
import { notifyPushDestination } from './src/utils/pushDestination';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import {
  streamConfigFromRoom,
  useSellerLiveResumePrompt,
} from './src/hooks/useSellerLiveResumePrompt';
import { withTimeout } from './src/utils/withTimeout';
import { getBuyerKycStatus, ApiError, type PlatformRoomResponse } from './src/api';
import i18n from './src/i18n';
import { BuyerKycOnboardingScreen } from './src/components/pages/BuyerKycOnboardingScreen';
import { LoginScreen } from './src/components/pages/LoginScreen';
import { RegisterScreen } from './src/components/pages/RegisterScreen';
import { ForgotPasswordScreen } from './src/components/pages/ForgotPasswordScreen';
// Onboarding desactivado por ahora (faltan textos e imágenes definitivos).
// import { OnboardingScreen } from './src/components/pages/OnboardingScreen';
import { HomeScreen } from './src/components/pages/HomeScreen';
import { LoadingScreen } from './src/components/pages/LoadingScreen';
import { StreamScreen } from './src/components/pages/StreamScreen';
import { StreamSwipeScreen } from './src/components/pages/StreamSwipeScreen';
import { SellerStreamScreen } from './src/components/pages/SellerStreamScreen';
import type { StreamData } from './src/components/molecules/StreamCard';
import type { StreamConfig } from './src/components/organisms/startLive/types';

type AuthScreen = 'onboarding' | 'login' | 'register' | 'forgot-password';
type AppScreen = AuthScreen | 'home' | 'stream' | 'stream-swipe' | 'seller-stream';

/**
 * Tope de espera del gate de KYC. Es la puerta de entrada a "Hacer un live" y a entrar
 * a un vivo: si la consulta no vuelve, el usuario tiene que enterarse, no quedarse
 * tocando un botón que no responde.
 */
const KYC_GATE_TIMEOUT_MS = 15000;

const homeShellStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

/**
 * Componente para manejar la navegación basada en autenticación
 */
function AuthenticatedAppShell({
  currentScreen,
  setCurrentScreen,
  selectedStream,
  setSelectedStream,
  swipeStreams,
  swipeInitialIndex,
  swipeCategoryUuid,
  setSwipeStreams,
  setSwipeInitialIndex,
  setSwipeCategoryUuid,
  activeStreamConfig,
  setActiveStreamConfig,
  resumeRoom,
  setResumeRoom,
}: {
  currentScreen: AppScreen;
  setCurrentScreen: (s: AppScreen) => void;
  selectedStream: StreamData | null;
  setSelectedStream: (s: StreamData | null) => void;
  swipeStreams: StreamData[] | null;
  swipeInitialIndex: number;
  swipeCategoryUuid: string | undefined;
  setSwipeStreams: (streams: StreamData[] | null) => void;
  setSwipeInitialIndex: (i: number) => void;
  setSwipeCategoryUuid: (c: string | undefined) => void;
  activeStreamConfig: StreamConfig | null;
  setActiveStreamConfig: (c: StreamConfig | null) => void;
  /** Vivo LIVE del vendedor a retomar tras un crash (B-04). */
  resumeRoom: PlatformRoomResponse | null;
  setResumeRoom: (r: PlatformRoomResponse | null) => void;
}) {
  const wizard = useStartLiveWizard();
  usePushNotifications(true);

  // Al abrir la app: si el vendedor tiene un vivo en curso (el servidor solo lo
  // devuelve dentro de los 2 min de gracia), ofrecer retomarlo. Sin vivo, nada.
  useSellerLiveResumePrompt({
    enabled: currentScreen === 'home' && !activeStreamConfig && !resumeRoom,
    onResume: (room) => {
      setResumeRoom(room);
      setCurrentScreen('seller-stream');
    },
  });

  /**
   * KYC obligatorio para participar de un vivo (comprador) o transmitir (vendedor).
   * Si el usuario aún no está verificado se muestra el flujo Didit y, al aprobar,
   * se ejecuta la acción pendiente.
   */
  const [kycGate, setKycGate] = useState<{ proceed: () => void } | null>(null);
  const kycVerifiedRef = useRef(false);
  const kycCheckingRef = useRef(false);

  const requireKycVerified = (proceed: () => void) => {
    if (kycVerifiedRef.current) {
      proceed();
      return;
    }
    if (kycCheckingRef.current) return;
    kycCheckingRef.current = true;
    void (async () => {
      try {
        // El KYC aprobado no revierte: el flag local evita la espera de red en cada tap.
        // Con timeout: si AsyncStorage o el backend no responden, la promesa igual termina
        // y se libera `kycCheckingRef`. Sin esto, un tap dejaba el guard trabado y todos
        // los taps siguientes eran silenciosos (botón muerto, sin error ni pantalla).
        if (await withTimeout(storage.getKycVerified(), KYC_GATE_TIMEOUT_MS, 'storage.getKycVerified')) {
          kycVerifiedRef.current = true;
          proceed();
          return;
        }
        const status = await withTimeout(
          getBuyerKycStatus(),
          KYC_GATE_TIMEOUT_MS,
          'getBuyerKycStatus'
        );
        if (status.verified) {
          kycVerifiedRef.current = true;
          // Cachear el flag no debe bloquear la acción: si AsyncStorage tarda o falla,
          // el usuario igual entra (en el próximo arranque se vuelve a consultar).
          void storage.setKycVerified().catch(() => {});
          proceed();
          return;
        }
        setKycGate({ proceed });
      } catch (error) {
        // No se pudo determinar el estado (red caída, backend viejo, etc.): avisar
        // en lugar de reemplazar la pantalla por el flujo de verificación.
        const message =
          error instanceof ApiError ? error.message : i18n.t('buyerOnboarding.kycPollError');
        appAlert(i18n.t('common.error'), message);
      } finally {
        kycCheckingRef.current = false;
      }
    })();
  };

  const openStartLiveWizard = () => {
    requireKycVerified(() => {
      void wizard.open();
    });
  };

  if (kycGate) {
    return (
      <BuyerKycOnboardingScreen
        allowSkip={false}
        onBack={() => setKycGate(null)}
        onProceedToComplete={() => {
          kycVerifiedRef.current = true;
          void storage.setKycVerified();
          const proceed = kycGate.proceed;
          setKycGate(null);
          proceed();
        }}
      />
    );
  }

  if (currentScreen === 'seller-stream' && (activeStreamConfig || resumeRoom)) {
    return (
      <>
        <SellerStreamScreen
          streamConfig={
            activeStreamConfig ?? streamConfigFromRoom(resumeRoom as PlatformRoomResponse)
          }
          resumeRoom={resumeRoom}
          onEndStream={() => {
            setCurrentScreen('home');
            setActiveStreamConfig(null);
            setResumeRoom(null);
          }}
        />
      </>
    );
  }

  if (currentScreen === 'stream-swipe' && swipeStreams) {
    return (
      <StreamSwipeScreen
        streams={swipeStreams}
        initialIndex={swipeInitialIndex}
        categoryUuid={swipeCategoryUuid}
        onClose={() => {
          setCurrentScreen('home');
          setSwipeStreams(null);
          setSwipeInitialIndex(0);
          setSwipeCategoryUuid(undefined);
        }}
      />
    );
  }

  if (currentScreen === 'stream' && selectedStream) {
    return (
      <StreamScreen
        /* StreamScreen asume una sala por montaje (el efecto de /stream/watch corta con
           `if (transport !== null) return` y nada resetea transport/ivsCreds). La key lo
           remonta al cambiar de sala, igual que hace la FlatList del swipe. */
        key={selectedStream.id}
        stream={selectedStream}
        onSwitchStream={setSelectedStream}
        onClose={() => {
          setCurrentScreen('home');
          setSelectedStream(null);
        }}
      />
    );
  }

  return (
    <View style={homeShellStyles.root}>
      <HomeScreen
        onStreamPress={(stream) => {
          requireKycVerified(() => {
            setSelectedStream(stream);
            setCurrentScreen('stream');
          });
        }}
        onStreamsSwipePress={(streams, index, categoryUuid) => {
          requireKycVerified(() => {
            setSwipeStreams(streams);
            setSwipeInitialIndex(index);
            setSwipeCategoryUuid(categoryUuid);
            setCurrentScreen('stream-swipe');
          });
        }}
        onStartNewStream={openStartLiveWizard}
      />
      <StartLiveWizardHost
        onStartLive={(config) => {
          setActiveStreamConfig(config);
          setCurrentScreen('seller-stream');
        }}
      />
    </View>
  );
}

/** Duración mínima del splash animado: el bootstrap de sesión suele tardar
 * milisegundos y la animación de marca no llegaba a verse. */
const MIN_SPLASH_MS = 1000;

function AppNavigator() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  // Onboarding desactivado: la app arranca en login hasta completar textos e imágenes.
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const prevAuthenticated = useRef(false);
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinSplashElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  /* ONBOARDING (desactivado — restaurar junto con el bloque de render de abajo)
  const [welcomeSeen, setWelcomeSeen] = useState(false);
  useEffect(() => {
    void storage.getWelcomeCarouselSeen().then((seen) => {
      if (seen) {
        setWelcomeSeen(true);
        setAuthScreen((prev) => (prev === 'onboarding' ? 'login' : prev));
      }
    });
  }, []);
  */

  // Si la sesión vence en medio del uso (refresh fallido), ir directo al login.
  useEffect(() => {
    if (isBootstrapping) return;
    if (!isAuthenticated && prevAuthenticated.current) {
      setAuthScreen('login');
    }
    prevAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, isBootstrapping]);

  /** JWT post-verify pero onboarding comprador incompleto: abrir registro para restaurar paso */
  useEffect(() => {
    if (isBootstrapping) {
      return;
    }
    let cancelled = false;
    (async () => {
      const token = await storage.getAccessToken();
      const pending = await storage.getPendingBuyerOnboarding();
      if (!cancelled && token && pending && !isAuthenticated) {
        setAuthScreen('register');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isBootstrapping, isAuthenticated]);

  useEffect(() => {
    const onUrl = ({ url }: { url: string }) => {
      if (isBuyerKycReturnUrl(url)) {
        notifyBuyerKycReturn();
        return;
      }
      if (isMpWalletReturnUrl(url)) {
        notifyMpWalletReturn(url);
        return;
      }
      if (isNotificationDeepLink(url)) {
        const dest = destinationFromDeepLink(url);
        if (dest) notifyPushDestination(dest);
      }
    };
    const sub = Linking.addEventListener('url', onUrl);
    void Linking.getInitialURL().then((url) => {
      if (isBuyerKycReturnUrl(url)) {
        notifyBuyerKycReturn();
        return;
      }
      if (url && isMpWalletReturnUrl(url)) {
        notifyMpWalletReturn(url);
        return;
      }
      if (url && isNotificationDeepLink(url)) {
        const dest = destinationFromDeepLink(url);
        if (dest) notifyPushDestination(dest);
      }
    });
    return () => sub.remove();
  }, []);

  const [selectedStream, setSelectedStream] = useState<StreamData | null>(null);
  const [swipeStreams, setSwipeStreams] = useState<StreamData[] | null>(null);
  const [swipeInitialIndex, setSwipeInitialIndex] = useState(0);
  const [swipeCategoryUuid, setSwipeCategoryUuid] = useState<string | undefined>(undefined);
  const [activeStreamConfig, setActiveStreamConfig] = useState<StreamConfig | null>(null);
  const [resumeRoom, setResumeRoom] = useState<PlatformRoomResponse | null>(null);

  if (isBootstrapping || !minSplashElapsed) {
    return <LoadingScreen />;
  }

      if (isAuthenticated) {
        return (
          <StartLiveWizardProvider>
            <AuthenticatedAppShell
              currentScreen={currentScreen}
              setCurrentScreen={setCurrentScreen}
              selectedStream={selectedStream}
              setSelectedStream={setSelectedStream}
              swipeStreams={swipeStreams}
              swipeInitialIndex={swipeInitialIndex}
              swipeCategoryUuid={swipeCategoryUuid}
              setSwipeStreams={setSwipeStreams}
              setSwipeInitialIndex={setSwipeInitialIndex}
              setSwipeCategoryUuid={setSwipeCategoryUuid}
              activeStreamConfig={activeStreamConfig}
              setActiveStreamConfig={setActiveStreamConfig}
              resumeRoom={resumeRoom}
              setResumeRoom={setResumeRoom}
            />
          </StartLiveWizardProvider>
        );
      }

  /* ONBOARDING (desactivado — restaurar junto con el estado welcomeSeen de arriba,
     el import de OnboardingScreen y los `onBack` comentados más abajo)
  if (authScreen === 'onboarding') {
    return (
      <OnboardingScreen
        onPressLogin={() => {
          void storage.setWelcomeCarouselSeen();
          setWelcomeSeen(true);
          setAuthScreen('login');
        }}
        onPressRegister={() => {
          void storage.setWelcomeCarouselSeen();
          setWelcomeSeen(true);
          setAuthScreen('register');
        }}
      />
    );
  }
  */

  if (authScreen === 'register') {
    return (
      <RegisterScreen
        // Con onboarding: setAuthScreen(welcomeSeen ? 'login' : 'onboarding')
        onBackToLogin={() => setAuthScreen('login')}
        onRegisterSuccess={() => setAuthScreen('login')}
      />
    );
  }

  if (authScreen === 'forgot-password') {
    return (
      <ForgotPasswordScreen onBackToLogin={() => setAuthScreen('login')} />
    );
  }

  return (
    <LoginScreen
      // Con onboarding: onBack={welcomeSeen ? undefined : () => setAuthScreen('onboarding')}
      onNavigateToRegister={() => setAuthScreen('register')}
      onNavigateToForgotPassword={() => setAuthScreen('forgot-password')}
    />
  );
}

function ThemedStatusBarAndApp() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#050f2f' : '#ffffff'}
      />
      {/*
       * Los drawers se montan acá adentro, al final del árbol: es lo que les permite
       * taparle la barra de navegación a `GeneralLayout` sin salirse de la ventana nativa
       * (el glass necesita seguir teniendo la pantalla detrás para difuminarla).
       */}
      <OverlayPortalProvider>
        <AppNavigator />
      </OverlayPortalProvider>
    </>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AlertProvider>
          <AuthProvider>
            <InterestCategoriesProvider>
              <ThemedStatusBarAndApp />
            </InterestCategoriesProvider>
          </AuthProvider>
        </AlertProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
