import React, { useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  Modal,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { FONT_FAMILY } from '../../../../theme/typography';
import { themeColors } from '../../../../theme/colors';
import type { MpWalletConnectSession } from '../../../../api/paymentsApi';
import {
  isMpWalletReturnUrl,
  parseMpWalletReturnUrl,
  resolveMpWalletCheckoutUrl,
  subscribeMpWalletReturn,
  type MpWalletReturnStatus,
} from '../../../../utils/mpWalletDeepLink';

export interface StreamMpWalletConnectModalProps {
  visible: boolean;
  session: MpWalletConnectSession | null;
  loading?: boolean;
  onReturn: (status: MpWalletReturnStatus) => void;
  onTestAckConfirm: () => void;
  onCancel: () => void;
}

export const StreamMpWalletConnectModal: React.FC<StreamMpWalletConnectModalProps> = ({
  visible,
  session,
  loading = false,
  onReturn,
  onTestAckConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const checkoutUrl = useMemo(() => {
    if (!session || session.test_ack_only) return null;
    return resolveMpWalletCheckoutUrl(session);
  }, [session]);

  useEffect(() => {
    if (!visible) return;
    const unsub = subscribeMpWalletReturn(onReturn);
    return unsub;
  }, [visible, onReturn]);

  const handleMpReturnUrl = (url: string): boolean => {
    if (!isMpWalletReturnUrl(url)) return false;
    const status = parseMpWalletReturnUrl(url);
    if (status) onReturn(status);
    return true;
  };

  const onShouldStartLoadWithRequest = (request: { url: string }): boolean => {
    return !handleMpReturnUrl(request.url);
  };

  const showLoader = loading || !session;
  const showTestAck = !showLoader && session.test_ack_only;
  const showWebView = !showLoader && !showTestAck && Boolean(checkoutUrl);

  useEffect(() => {
    if (!visible || loading || !session || session.test_ack_only) return;
    if (!checkoutUrl) {
      Alert.alert(t('common.appName'), t('stream.wallet.mpConnectNoUrl'));
      onCancel();
    }
  }, [visible, loading, session, checkoutUrl, onCancel, t]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={[styles.host, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <RNText style={styles.headerTitle} numberOfLines={2} maxFontSizeMultiplier={1.15}>
            {t('stream.wallet.mpConnectTitle')}
          </RNText>
          <TouchableOpacity
            onPress={onCancel}
            hitSlop={12}
            style={styles.closeBtn}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <X size={22} color={themeColors.glass.text} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        {showLoader ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={themeColors.primary} />
            <RNText style={styles.bodyText}>{t('stream.wallet.mpConnectLoading')}</RNText>
          </View>
        ) : null}

        {showTestAck ? (
          <ScrollView contentContainerStyle={styles.testAckContent} keyboardShouldPersistTaps="handled">
            <RNText style={styles.testAckTitle}>{t('stream.wallet.mpTestAckTitle')}</RNText>
            <RNText style={styles.testAckBody}>{t('stream.wallet.mpTestAckBody')}</RNText>
            <TouchableOpacity style={styles.primaryBtn} onPress={onTestAckConfirm} activeOpacity={0.85}>
              <RNText style={styles.primaryBtnText}>{t('stream.wallet.mpTestAckConfirm')}</RNText>
            </TouchableOpacity>
          </ScrollView>
        ) : null}

        {showWebView && checkoutUrl ? (
          <View style={styles.webviewWrap}>
            <RNText style={styles.hint}>{t('stream.wallet.mpWebViewHint')}</RNText>
            <WebView
              source={{ uri: checkoutUrl }}
              onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
              onNavigationStateChange={(nav) => {
                handleMpReturnUrl(nav.url);
              }}
              setSupportMultipleWindows={false}
              style={styles.webview}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              thirdPartyCookiesEnabled
              sharedCookiesEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webviewLoading}>
                  <ActivityIndicator size="large" color={themeColors.primary} />
                </View>
              )}
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  host: {
    flex: 1,
    backgroundColor: '#02050F',
  },
  /** Header canónico: título a la izquierda + X 22 en caja 40×40 a la derecha. */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  headerTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: themeColors.glass.text,
    flex: 1,
    marginRight: 8,
    includeFontPadding: false,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webviewWrap: {
    flex: 1,
    paddingTop: 16,
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webviewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#02050F',
  },
  hint: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 18,
    color: themeColors.glass.textSoft,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
    includeFontPadding: false,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 28,
  },
  bodyText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 22,
    color: themeColors.glass.textSoft,
    textAlign: 'center',
    includeFontPadding: false,
  },
  testAckContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 20,
  },
  testAckTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 18,
    lineHeight: 26,
    color: themeColors.glass.text,
    textAlign: 'center',
    includeFontPadding: false,
  },
  testAckBody: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 22,
    color: themeColors.glass.textSoft,
    textAlign: 'center',
    includeFontPadding: false,
  },
  primaryBtn: {
    height: 40,
    borderRadius: 1000,
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    alignSelf: 'stretch',
  },
  primaryBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.text,
    includeFontPadding: false,
  },
});
