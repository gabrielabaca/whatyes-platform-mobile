/**
 * Paso opcional: verificación de identidad (Didit) antes del mensaje final de registro comprador.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check } from 'lucide-react-native';
import { Text } from '../../atoms/Text';
import { Button } from '../../atoms/Button';
import { useTheme } from '../../../context/ThemeContext';
import { themeColors } from '../../../theme/colors';
import { FONT_FAMILY } from '../../../theme/typography';
import { createBuyerKycSession, getBuyerKycStatus, ApiError } from '../../../api';
import {
  isBuyerKycReturnUrl,
  subscribeBuyerKycReturn,
} from '../../../utils/buyerKycDeepLink';
import { appAlert } from '../../../alerts';

interface BuyerKycOnboardingScreenProps {
  onBack?: () => void;
  onProceedToComplete: () => void;
  /**
   * false = verificación obligatoria (gating de vivos): sin "Omitir" y el rechazo
   * ofrece reintentar en lugar de continuar. Default true (onboarding de registro).
   */
  allowSkip?: boolean;
}

type Phase = 'offer' | 'loading' | 'webview' | 'polling' | 'success' | 'declined';

const POLL_INTERVAL_MS = 1000;
const POLL_MAX_ATTEMPTS = 60;

const TERMINAL_FAIL = new Set(['Declined', 'Abandoned', 'Expired']);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const BuyerKycOnboardingScreen: React.FC<BuyerKycOnboardingScreenProps> = ({
  onBack,
  onProceedToComplete,
  allowSkip = true,
}) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const c = isDark ? themeColors.dark : themeColors.light;
  const [phase, setPhase] = useState<Phase>('offer');
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const pollingRef = useRef(false);

  const beginPoll = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    setPhase('polling');
    try {
      for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
        const s = await getBuyerKycStatus();
        if (s.verified) {
          setPhase('success');
          return;
        }
        const st = s.status || '';
        if (TERMINAL_FAIL.has(st)) {
          setPhase('declined');
          return;
        }
        await sleep(POLL_INTERVAL_MS);
      }
      setPhase('declined');
    } catch (e) {
      if (e instanceof ApiError) {
        appAlert(t('common.error'), e.message);
      } else {
        appAlert(t('common.error'), t('buyerOnboarding.kycPollError'));
      }
      setPhase('offer');
    } finally {
      pollingRef.current = false;
    }
  }, [t]);

  useEffect(() => {
    const unsub = subscribeBuyerKycReturn(() => {
      setVerificationUrl(null);
      void beginPoll();
    });
    return unsub;
  }, [beginPoll]);

  const handleVerify = async () => {
    setPhase('loading');
    try {
      const res = await createBuyerKycSession();
      setVerificationUrl(res.verification_url);
      setPhase('webview');
    } catch (e) {
      if (e instanceof ApiError) {
        appAlert(t('common.error'), e.message);
      } else {
        appAlert(t('common.error'), t('buyerOnboarding.kycSessionError'));
      }
      setPhase('offer');
    }
  };

  const onNavChange = (url: string) => {
    if (isBuyerKycReturnUrl(url)) {
      setVerificationUrl(null);
      void beginPoll();
    }
  };

  const offerUi = (
    <SafeAreaView className="flex-1 bg-[#FEFEFE] dark:bg-night-950">
      <View className="flex-1">
        <View className="relative flex-row items-center justify-between px-6 pt-4 min-h-[44px]">
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              className="z-10 h-10 w-10 items-center justify-center"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={22} color={c.text} />
            </TouchableOpacity>
          ) : (
            <View className="h-10 w-10" />
          )}
          <View className="absolute left-0 right-0 top-0 bottom-0 items-center justify-center px-14 pointer-events-none">
            <Text
              style={{ fontFamily: FONT_FAMILY.bold, textAlign: 'center' }}
              className="text-[#02050F] dark:text-white text-[20px] leading-7 tracking-[0.1px]"
              numberOfLines={2}
            >
              {t('buyerOnboarding.kycTitle')}
            </Text>
          </View>
          <View className="h-10 w-10" />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1">
            <Text
              style={{ fontFamily: FONT_FAMILY.regular, textAlign: 'center' }}
              className="text-[#4C4E55] dark:text-night-muted text-[14px] leading-[22px] tracking-[0.07px] w-full max-w-[340px] self-center"
            >
              {allowSkip ? t('buyerOnboarding.kycSubtitle') : t('buyerOnboarding.kycRequiredSubtitle')}
            </Text>
            <View className="flex-1 min-h-4" />
          </View>

          <View className="gap-3 w-full max-w-[400px] self-center mt-6">
            <Button
              title={t('buyerOnboarding.kycVerifyCta')}
              variant="primary"
              size="large"
              loading={phase === 'loading' || phase === 'polling'}
              disabled={phase === 'loading' || phase === 'polling'}
              onPress={handleVerify}
              className="w-full min-h-[52px] rounded-full"
            />
            {allowSkip ? (
              <Button
                title={t('buyerOnboarding.kycSkip')}
                variant="ghost"
                size="medium"
                disabled={phase === 'loading' || phase === 'polling'}
                onPress={onProceedToComplete}
                titleClassName="text-[15px]"
                className="min-h-[48px] rounded-full"
              />
            ) : null}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );

  if (phase === 'success') {
    return (
      <SafeAreaView className="flex-1 bg-[#FEFEFE] dark:bg-night-950">
        <View className="flex-1 px-6 pt-12 pb-8 justify-between">
          <View className="items-center gap-4">
            <View className="w-16 h-16 rounded-full bg-[#E8F9F0] items-center justify-center">
              <Check size={36} color="#00C566" strokeWidth={3} />
            </View>
            <Text
              style={{ fontFamily: FONT_FAMILY.bold }}
              className="text-center text-[#02050F] dark:text-white text-[22px]"
            >
              {t('buyerOnboarding.kycVerifiedTitle')}
            </Text>
            <Text
              style={{ fontFamily: FONT_FAMILY.regular }}
              className="text-center text-[#4C4E55] dark:text-night-muted text-[14px] leading-[22px]"
            >
              {t('buyerOnboarding.kycVerifiedSubtitle')}
            </Text>
          </View>
          <Button
            title={t('common.continue')}
            variant="primary"
            size="large"
            onPress={onProceedToComplete}
            className="w-full min-h-[52px] rounded-full"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'declined') {
    return (
      <SafeAreaView className="flex-1 bg-[#FEFEFE] dark:bg-night-950">
        <View className="flex-1 px-6 pt-12 pb-8 justify-between">
          <View>
            <Text
              style={{ fontFamily: FONT_FAMILY.bold }}
              className="text-center text-[#02050F] dark:text-white text-[20px] mb-3"
            >
              {t('buyerOnboarding.kycDeclinedTitle')}
            </Text>
            <Text
              style={{ fontFamily: FONT_FAMILY.regular }}
              className="text-center text-[#4C4E55] dark:text-night-muted text-[14px] leading-[22px]"
            >
              {allowSkip
                ? t('buyerOnboarding.kycDeclinedSubtitle')
                : t('buyerOnboarding.kycRequiredDeclinedSubtitle')}
            </Text>
          </View>
          <Button
            title={allowSkip ? t('common.continue') : t('buyerOnboarding.kycRetry')}
            variant="primary"
            size="large"
            onPress={allowSkip ? onProceedToComplete : () => setPhase('offer')}
            className="w-full min-h-[52px] rounded-full"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      {phase === 'offer' || phase === 'loading' ? offerUi : null}
      {phase === 'polling' ? (
        <SafeAreaView className="flex-1 bg-[#FEFEFE] dark:bg-night-950 items-center justify-center">
          <ActivityIndicator size="large" color="#685CF0" />
          <Text className="mt-4 text-[#4C4E55] dark:text-night-muted">{t('buyerOnboarding.kycPolling')}</Text>
        </SafeAreaView>
      ) : null}
      <Modal visible={phase === 'webview' && !!verificationUrl} animationType="slide">
        <SafeAreaView className="flex-1 bg-black">
          {verificationUrl ? (
            <WebView
              source={{ uri: verificationUrl }}
              onNavigationStateChange={(nav) => onNavChange(nav.url)}
              onShouldStartLoadWithRequest={(req) => {
                if (isBuyerKycReturnUrl(req.url)) {
                  setVerificationUrl(null);
                  void beginPoll();
                  return false;
                }
                return true;
              }}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={['https://*', 'http://*', 'pulpolive://*']}
            />
          ) : null}
          <Button
            title={t('common.cancel')}
            variant="outline"
            size="small"
            onPress={() => {
              setVerificationUrl(null);
              setPhase('offer');
            }}
            className="absolute top-12 right-4 bg-white/90 dark:bg-night-800 min-h-[40px] rounded-full"
          />
        </SafeAreaView>
      </Modal>
    </>
  );
};
