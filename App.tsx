/**
 * PulpoLive App
 * React Native App with NativeWind and Atomic Design
 *
 * @format
 */

import './global.css';
import React, { useState, useEffect } from 'react';
import { StatusBar, Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { InterestCategoriesProvider } from './src/context/InterestCategoriesContext';
import { storage } from './src/utils/storage';
import { isBuyerKycReturnUrl, notifyBuyerKycReturn } from './src/utils/buyerKycDeepLink';
import { LoginScreen } from './src/components/pages/LoginScreen';
import { RegisterScreen } from './src/components/pages/RegisterScreen';
import { ForgotPasswordScreen } from './src/components/pages/ForgotPasswordScreen';
import { OnboardingScreen } from './src/components/pages/OnboardingScreen';
import { HomeScreen } from './src/components/pages/HomeScreen';
import { LoadingScreen } from './src/components/pages/LoadingScreen';
import { StreamScreen } from './src/components/pages/StreamScreen';
import { StreamConfigScreen } from './src/components/pages/StreamConfigScreen';
import { SellerStreamScreen } from './src/components/pages/SellerStreamScreen';
import type { StreamData } from './src/components/molecules/StreamCard';
import type { StreamConfig } from './src/components/pages/StreamConfigScreen';

type AuthScreen = 'onboarding' | 'login' | 'register' | 'forgot-password';
type AppScreen = AuthScreen | 'home' | 'stream' | 'stream-config' | 'seller-stream';

/**
 * Componente para manejar la navegación basada en autenticación
 */
function AppNavigator() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const [authScreen, setAuthScreen] = useState<AuthScreen>('onboarding');
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('onboarding');

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
      }
    };
    const sub = Linking.addEventListener('url', onUrl);
    void Linking.getInitialURL().then((url) => {
      if (isBuyerKycReturnUrl(url)) {
        notifyBuyerKycReturn();
      }
    });
    return () => sub.remove();
  }, []);

  const [selectedStream, setSelectedStream] = useState<StreamData | null>(null);
  const [streamDraft, setStreamDraft] = useState<StreamConfig | null>(null);
  const [activeStreamConfig, setActiveStreamConfig] = useState<StreamConfig | null>(null);

  if (isBootstrapping) {
    return <LoadingScreen />;
  }

      if (isAuthenticated) {
        // Si está transmitiendo el seller (stream activo)
        if (currentScreen === 'seller-stream' && activeStreamConfig) {
          return (
            <SellerStreamScreen
              streamConfig={activeStreamConfig}
              onEndStream={() => {
                setCurrentScreen('home');
                setActiveStreamConfig(null);
              }}
            />
          );
        }
        
        // Si hay un stream seleccionado, mostrar pantalla de stream
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
        
        // Si está en la pantalla de configuración de stream
        if (currentScreen === 'stream-config') {
          return (
            <StreamConfigScreen
              draft={streamDraft}
              onBack={() => {
                setCurrentScreen('home');
                setStreamDraft(null);
              }}
              onStartStream={(config) => {
                // Iniciar el stream y navegar a la pantalla de transmisión
                console.log('Stream config:', config);
                setActiveStreamConfig(config);
                setCurrentScreen('seller-stream');
                setStreamDraft(null);
              }}
            />
          );
        }
        
        return (
          <HomeScreen
            onStreamPress={(stream) => {
              setSelectedStream(stream);
              setCurrentScreen('stream');
            }}
            onStartNewStream={() => {
              setStreamDraft(null);
              setCurrentScreen('stream-config');
            }}
            onEditDraft={(draft) => {
              setStreamDraft(draft);
              setCurrentScreen('stream-config');
            }}
          />
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
