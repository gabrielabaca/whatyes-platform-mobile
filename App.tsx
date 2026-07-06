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
import { StartLiveWizardProvider, useStartLiveWizard } from './src/hooks/useStartLiveWizard';
import { StartLiveWizardHost } from './src/components/organisms/startLive/StartLiveWizardHost';
import { storage } from './src/utils/storage';
import { isBuyerKycReturnUrl, notifyBuyerKycReturn } from './src/utils/buyerKycDeepLink';
import { isMpWalletReturnUrl, notifyMpWalletReturn } from './src/utils/mpWalletDeepLink';
import { LoginScreen } from './src/components/pages/LoginScreen';
import { RegisterScreen } from './src/components/pages/RegisterScreen';
import { ForgotPasswordScreen } from './src/components/pages/ForgotPasswordScreen';
import { OnboardingScreen } from './src/components/pages/OnboardingScreen';
import { HomeScreen } from './src/components/pages/HomeScreen';
import { LoadingScreen } from './src/components/pages/LoadingScreen';
import { StreamScreen } from './src/components/pages/StreamScreen';
import { StreamSwipeScreen } from './src/components/pages/StreamSwipeScreen';
import { StreamConfigScreen } from './src/components/pages/StreamConfigScreen';
import { SellerStreamScreen } from './src/components/pages/SellerStreamScreen';
import type { StreamData } from './src/components/molecules/StreamCard';
import type { StreamConfig } from './src/components/pages/StreamConfigScreen';

type AuthScreen = 'onboarding' | 'login' | 'register' | 'forgot-password';
type AppScreen = AuthScreen | 'home' | 'stream' | 'stream-swipe' | 'stream-config' | 'seller-stream';

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
  streamDraft,
  setStreamDraft,
  activeStreamConfig,
  setActiveStreamConfig,
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
  streamDraft: StreamConfig | null;
  setStreamDraft: (d: StreamConfig | null) => void;
  activeStreamConfig: StreamConfig | null;
  setActiveStreamConfig: (c: StreamConfig | null) => void;
}) {
  const wizard = useStartLiveWizard();

  const openStartLiveWizard = () => {
    void wizard.open();
  };

  if (currentScreen === 'seller-stream' && activeStreamConfig) {
    return (
      <>
        <SellerStreamScreen
          streamConfig={activeStreamConfig}
          onEndStream={() => {
            setCurrentScreen('home');
            setActiveStreamConfig(null);
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
        stream={selectedStream}
        onClose={() => {
          setCurrentScreen('home');
          setSelectedStream(null);
        }}
      />
    );
  }

  if (currentScreen === 'stream-config') {
    return (
      <StreamConfigScreen
        draft={streamDraft}
        onBack={() => {
          setCurrentScreen('home');
          setStreamDraft(null);
        }}
        onStartStream={(config) => {
          setActiveStreamConfig(config);
          setCurrentScreen('seller-stream');
          setStreamDraft(null);
        }}
      />
    );
  }

  return (
    <View style={homeShellStyles.root}>
      <HomeScreen
        onStreamPress={(stream) => {
          setSelectedStream(stream);
          setCurrentScreen('stream');
        }}
        onStreamsSwipePress={(streams, index, categoryUuid) => {
          setSwipeStreams(streams);
          setSwipeInitialIndex(index);
          setSwipeCategoryUuid(categoryUuid);
          setCurrentScreen('stream-swipe');
        }}
        onStartNewStream={openStartLiveWizard}
        onEditDraft={(draft) => {
          setStreamDraft(draft);
          setCurrentScreen('stream-config');
        }}
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
const MIN_SPLASH_MS = 2500;

function AppNavigator() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const [authScreen, setAuthScreen] = useState<AuthScreen>('onboarding');
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('onboarding');
  const prevAuthenticated = useRef(false);
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinSplashElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

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
      }
    });
    return () => sub.remove();
  }, []);

  const [selectedStream, setSelectedStream] = useState<StreamData | null>(null);
  const [swipeStreams, setSwipeStreams] = useState<StreamData[] | null>(null);
  const [swipeInitialIndex, setSwipeInitialIndex] = useState(0);
  const [swipeCategoryUuid, setSwipeCategoryUuid] = useState<string | undefined>(undefined);
  const [streamDraft, setStreamDraft] = useState<StreamConfig | null>(null);
  const [activeStreamConfig, setActiveStreamConfig] = useState<StreamConfig | null>(null);

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
              streamDraft={streamDraft}
              setStreamDraft={setStreamDraft}
              activeStreamConfig={activeStreamConfig}
              setActiveStreamConfig={setActiveStreamConfig}
            />
          </StartLiveWizardProvider>
        );
      }

  if (authScreen === 'onboarding') {
    return (
      <OnboardingScreen
        onPressLogin={() => setAuthScreen('login')}
        onPressRegister={() => setAuthScreen('register')}
      />
    );
  }

  if (authScreen === 'register') {
    return (
      <RegisterScreen
        onBackToLogin={() => setAuthScreen('onboarding')}
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
      onBack={() => setAuthScreen('onboarding')}
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
      <AppNavigator />
    </>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <InterestCategoriesProvider>
            <ThemedStatusBarAndApp />
          </InterestCategoriesProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
