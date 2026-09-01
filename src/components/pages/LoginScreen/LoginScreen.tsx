import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff } from 'lucide-react-native';
import { Text } from '../../atoms/Text';
import { Button } from '../../atoms/Button';
import { AppTextInput } from '../../atoms/AppTextInput';
import { KeyboardDismissScrollView } from '../../atoms/KeyboardDismissScrollView';
import { AuthHeader } from '../../molecules/auth';
import { useAuth } from '../../../hooks/useAuth';
import { ApiError } from '../../../api';
import type { SocialProvider } from '../../../api/types';
import { isAppleSignInSupported } from '../../../services/socialAuth';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { useTheme } from '../../../context/ThemeContext';
import { isValidEmail } from '../../../utils/formValidation';
import GoogleIcon from '../../../../assets/icons/google.svg';
import AppleIcon from '../../../../assets/icons/apple.svg';
import { appAlert } from '../../../alerts';

interface LoginScreenProps {
  onBack?: () => void;
  onNavigateToRegister?: () => void;
  onNavigateToForgotPassword?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onBack,
  onNavigateToRegister,
  onNavigateToForgotPassword,
}) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const c = isDark ? themeColors.dark : themeColors.light;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const { login, socialLogin, isLoading } = useAuth();
  const showAppleButton = isAppleSignInSupported();

  const handleSocial = async (provider: SocialProvider) => {
    try {
      await socialLogin(provider);
      // Sesión activa → la navegación la maneja App.tsx (igual que login).
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error && error.message
            ? error.message
            : t('login.socialFailed');
      appAlert(t('common.error'), message);
    }
  };

  const handleLogin = async () => {
    setPasswordError(null);
    setEmailError(null);

    // Campos vacíos: error inline por campo (mismo patrón que validateBuyerForm en
    // RegisterScreen). El botón queda siempre habilitado — criterio unificado de auth.
    if (!email.trim() || !password) {
      if (!email.trim()) setEmailError(t('register.fillRequired'));
      if (!password) setPasswordError(t('register.fillRequired'));
      return;
    }

    if (!isValidEmail(email.trim())) {
      setEmailError(t('common.invalidEmail'));
      return;
    }

    try {
      await login({
        username: email,
        password,
      });
      // La navegación se maneja automáticamente en App.tsx
    } catch (error) {
      if (error instanceof ApiError) {
        const isInvalidCredentials =
          error.status === 400 ||
          error.status === 401 ||
          error.status === 403 ||
          error.message === 'Incorrect username or password' ||
          /credential|credencial|contrase|password|invalid/i.test(error.message);

        if (isInvalidCredentials) {
          setPasswordError(t('login.passwordIncorrect'));
          return;
        }

        appAlert(t('common.error'), error.message);
      } else {
        appAlert(t('common.error'), t('login.loginFailed'));
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FEFEFE] dark:bg-night-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <KeyboardDismissScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 pt-4 pb-6">
            <AuthHeader title={t('login.title')} onBack={onBack} className="mt-2 mb-10" />

            <View className="mb-7 mt-4">
              <View className="relative">
                <Text className="text-[10px] text-[#34363E] dark:text-night-muted mb-2">{t('common.email')}</Text>
                <View className="mb-4">
                  <AppTextInput
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);
                      if (passwordError) setPasswordError(null);
                      if (emailError) setEmailError(null);
                    }}
                    placeholder={t('common.emailPlaceholder')}
                    placeholderTextColor={isDark ? themeColors.dark.textMuted : '#7D7E83'}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    editable={!isLoading}
                    style={{ fontFamily: FONT_FAMILY.regular }}
                    className={`rounded-full px-4 py-4 text-[12px] text-[#02050F] dark:text-white dark:bg-night-800 min-h-[52px] border ${
                      emailError ? 'border-[#E53935]' : 'border-[#D9D9D9] dark:border-[#D9D9D9]'
                    }`}
                  />
                  {emailError ? (
                    <Text className="mt-1 text-[10px] leading-[18px]" style={{ color: '#E53935' }}>
                      {emailError}
                    </Text>
                  ) : null}
                </View>

                <Text className="text-[10px] text-[#34363E] dark:text-night-muted mb-2">{t('common.password')}</Text>
                <View className="relative">
                  <AppTextInput
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      if (passwordError) setPasswordError(null);
                      if (emailError) setEmailError(null);
                    }}
                    placeholder={t('login.passwordPlaceholder')}
                    placeholderTextColor={isDark ? themeColors.dark.textMuted : '#7D7E83'}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    editable={!isLoading}
                    style={{ fontFamily: FONT_FAMILY.regular }}
                    className={`border rounded-full px-4 py-4 pr-12 text-[12px] text-[#02050F] dark:text-white dark:bg-night-800 min-h-[52px] ${passwordError ? 'border-[#E53935]' : 'border-[#D9D9D9] dark:border-[#D9D9D9]'}`}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-0 bottom-0 justify-center"
                    disabled={isLoading}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? t('common.hidePassword') : t('common.showPassword')}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={c.text} />
                    ) : (
                      <Eye size={18} color={c.text} />
                    )}
                  </TouchableOpacity>
                </View>
                {isLoading && (
                  <View className="absolute inset-0 items-center justify-center bg-[#FEFEFE]/70 dark:bg-night-950/70 rounded-2xl">
                    <ActivityIndicator color="#685CF0" size="large" />
                  </View>
                )}
              </View>
              {/* Espacio reservado para una línea de error: el mensaje entra en el flujo
                  normal y el botón no se mueve al aparecer o desaparecer. */}
              <View className="mt-2 mb-4 min-h-[18px]">
                {passwordError ? (
                  <Text style={{ color: '#E53935', fontSize: 10, lineHeight: 18 }}>
                    {passwordError}
                  </Text>
                ) : null}
              </View>

              <Button
                title={t('common.continue')}
                variant="primary"
                size="large"
                onPress={handleLogin}
                activeOpacity={0.9}
                disabled={isLoading}
                className="w-full rounded-full"
              />

              <TouchableOpacity
                onPress={onNavigateToForgotPassword}
                className="items-center mt-3"
                accessibilityRole="link"
              >
                <Text className="text-primary-600 text-[12px] font-bold">{t('login.forgotPassword')}</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center mb-6">
              <View className="h-px flex-1 bg-[#D9D9D9] dark:bg-night-700" />
              <Text className="mx-4 text-[#4C4E55] dark:text-night-muted text-[14px] font-bold">{t('common.or')}</Text>
              <View className="h-px flex-1 bg-[#D9D9D9] dark:bg-night-700" />
            </View>

            <View className="gap-[18px]">
              <TouchableOpacity
                onPress={() => handleSocial('google')}
                disabled={isLoading}
                activeOpacity={0.8}
                accessibilityRole="button"
                className="border border-[#02050F] dark:border-white rounded-full min-h-[52px] px-6 flex-row items-center justify-center"
              >
                <View className="w-6 h-6 mr-2 items-center justify-center">
                  <GoogleIcon width={24} height={24} />
                </View>
                <Text className="text-[#02050F] dark:text-white text-base font-semibold">{t('login.continueWithGoogle')}</Text>
              </TouchableOpacity>
              {showAppleButton && (
                <TouchableOpacity
                  onPress={() => handleSocial('apple')}
                  disabled={isLoading}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  className="border border-[#02050F] dark:border-white rounded-full min-h-[52px] px-6 flex-row items-center justify-center"
                >
                  <View className="w-6 h-6 mr-2 items-center justify-center">
                    <AppleIcon width={24} height={24} />
                  </View>
                  <Text className="text-[#02050F] dark:text-white text-base font-semibold">{t('login.continueWithApple')}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View className="mt-12 items-center">
              <Text className="text-[#4C4E55] dark:text-night-muted text-[12px]">
                {t('login.noAccount')}{' '}
                <Text
                  className="text-primary-600 text-[12px] font-bold"
                  accessibilityRole="link"
                  onPress={onNavigateToRegister}
                >
                  {t('login.register')}
                </Text>
              </Text>
            </View>
          </View>
        </KeyboardDismissScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
