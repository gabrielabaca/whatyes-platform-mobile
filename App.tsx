/**
 * WhatYes! App
 * React Native App with NativeWind and Atomic Design
 *
 * @format
 */

import './global.css';
import React, { useState } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/components/pages/LoginScreen';
import { RegisterScreen } from './src/components/pages/RegisterScreen';
import { ForgotPasswordScreen } from './src/components/pages/ForgotPasswordScreen';
import { HomeScreen } from './src/components/pages/HomeScreen';
import { LoadingScreen } from './src/components/pages/LoadingScreen';
import { StreamScreen } from './src/components/pages/StreamScreen';
import { StreamConfigScreen } from './src/components/pages/StreamConfigScreen';
import { SellerStreamScreen } from './src/components/pages/SellerStreamScreen';
import type { StreamData } from './src/components/molecules/StreamCard';
import type { StreamConfig } from './src/components/pages/StreamConfigScreen';

type AuthScreen = 'login' | 'register' | 'forgot-password';
type AppScreen = AuthScreen | 'home' | 'stream' | 'stream-config' | 'seller-stream';

/**
 * Componente para manejar la navegación basada en autenticación
 */
function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('login');
  const [selectedStream, setSelectedStream] = useState<StreamData | null>(null);
  const [streamDraft, setStreamDraft] = useState<StreamConfig | null>(null);
  const [activeStreamConfig, setActiveStreamConfig] = useState<StreamConfig | null>(null);

  if (isLoading) {
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

  if (authScreen === 'register') {
    return (
      <RegisterScreen
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
      onNavigateToRegister={() => setAuthScreen('register')}
      onNavigateToForgotPassword={() => setAuthScreen('forgot-password')}
    />
  );
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor="#ffffff"
        />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
