/**
 * Verificación KYC Didit reutilizable (stream wallet, perfil, etc.).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StreamBottomSheet, streamSheetStyles } from '../stream/StreamBottomSheet';
import { FONT_FAMILY } from '../../../theme/typography';
import { createBuyerKycSession, getBuyerKycStatus, ApiError } from '../../../api';
import {
  isBuyerKycReturnUrl,
  subscribeBuyerKycReturn,
} from '../../../utils/buyerKycDeepLink';

export interface BuyerKycModalProps {
  visible: boolean;
  onClose: () => void;
  onVerified: () => void;
}

type Phase = 'offer' | 'loading' | 'webview' | 'polling' | 'success' | 'declined';

const POLL_INTERVAL_MS = 1000;
const POLL_MAX_ATTEMPTS = 60;
const TERMINAL_FAIL = new Set(['Declined', 'Abandoned', 'Expired']);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const BuyerKycModal: React.FC<BuyerKycModalProps> = ({
  visible,
  onClose,
  onVerified,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('offer');
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const pollingRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      setPhase('offer');
      setVerificationUrl(null);
      pollingRef.current = false;
    }
  }, [visible]);

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
        Alert.alert(t('common.error'), e.message);
      } else {
        Alert.alert(t('common.error'), t('buyerOnboarding.kycPollError'));
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
        Alert.alert(t('common.error'), e.message);
      } else {
        Alert.alert(t('common.error'), t('buyerOnboarding.kycSessionError'));
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

  if (phase === 'success') {
    return (
      <StreamBottomSheet
        visible={visible}
        title={t('buyerOnboarding.kycVerifiedTitle')}
        onClose={onClose}
        footer={
          <View style={styles.footer}>
            <TouchableOpacity
              style={streamSheetStyles.primaryBtn}
              onPress={() => {
                onVerified();
              }}
              activeOpacity={0.85}
            >
              <RNText style={streamSheetStyles.primaryBtnText}>
                {t('common.continue')}
              </RNText>
            </TouchableOpacity>
          </View>
        }
      >
        <View style={styles.successIcon}>
          <Check size={36} color="#00C566" strokeWidth={3} />
        </View>
        <RNText style={streamSheetStyles.bodyText}>
          {t('buyerOnboarding.kycVerifiedSubtitle')}
        </RNText>
      </StreamBottomSheet>
    );
  }

  if (phase === 'declined') {
    return (
      <StreamBottomSheet
        visible={visible}
        title={t('buyerOnboarding.kycDeclinedTitle')}
        onClose={onClose}
        footer={
          <View style={styles.footer}>
            <TouchableOpacity
              style={streamSheetStyles.primaryBtn}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <RNText style={streamSheetStyles.primaryBtnText}>
                {t('common.cancel')}
              </RNText>
            </TouchableOpacity>
          </View>
        }
      >
        <RNText style={streamSheetStyles.bodyText}>
          {t('buyerOnboarding.kycDeclinedSubtitle')}
        </RNText>
      </StreamBottomSheet>
    );
  }

  if (phase === 'polling') {
    return (
      <StreamBottomSheet
        visible={visible}
        title={t('buyerOnboarding.kycTitle')}
        onClose={onClose}
      >
        <ActivityIndicator color="#685CF0" size="large" style={styles.loader} />
        <RNText style={streamSheetStyles.bodyText}>{t('buyerOnboarding.kycPolling')}</RNText>
      </StreamBottomSheet>
    );
  }

  return (
    <>
      <StreamBottomSheet
        visible={visible && (phase === 'offer' || phase === 'loading')}
        title={t('buyerOnboarding.kycTitle')}
        onClose={onClose}
        footer={
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                streamSheetStyles.primaryBtn,
                phase === 'loading' && styles.btnDisabled,
              ]}
              onPress={handleVerify}
              disabled={phase === 'loading'}
              activeOpacity={0.85}
            >
              {phase === 'loading' ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <RNText style={streamSheetStyles.primaryBtnText}>
                  {t('buyerOnboarding.kycVerifyCta')}
                </RNText>
              )}
            </TouchableOpacity>
          </View>
        }
      >
        <RNText style={streamSheetStyles.bodyText}>{t('buyerOnboarding.kycSubtitle')}</RNText>
        <RNText style={styles.required}>{t('stream.wallet.kycRequired')}</RNText>
      </StreamBottomSheet>

      <Modal visible={phase === 'webview' && !!verificationUrl} animationType="slide">
        <View style={[styles.webviewHost, { paddingTop: insets.top }]}>
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
          <TouchableOpacity
            onPress={() => {
              setVerificationUrl(null);
              setPhase('offer');
            }}
            style={[styles.webviewCancel, { top: insets.top + 12 }]}
          >
            <RNText style={styles.webviewCancelText}>{t('common.cancel')}</RNText>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  required: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 18,
    color: '#FDC700',
    includeFontPadding: false,
  },
  loader: {
    marginVertical: 24,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,197,102,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  webviewHost: {
    flex: 1,
    backgroundColor: '#000',
  },
  webviewCancel: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 1000,
  },
  webviewCancelText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    color: '#18181B',
    includeFontPadding: false,
  },
});
