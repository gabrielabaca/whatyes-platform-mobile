/**
 * Modal a pantalla completa para Términos, Privacidad y FAQ.
 * El WebView sigue el patrón de BuyerKycModal (origen, JS, cookies de documento).
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text as RNText } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import {
  GlassFullScreenModal,
  type GlassFullScreenModalHandle,
} from '../profile/GlassFullScreenModal';
import { GlassModalHeader } from '../profile/GlassModalHeader';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';

export interface LegalWebViewModalProps {
  visible: boolean;
  title: string;
  url: string;
  onClose: () => void;
}

export const LegalWebViewModal: React.FC<LegalWebViewModalProps> = ({
  visible,
  title,
  url,
  onClose,
}) => {
  const { t } = useTranslation();
  const modalRef = useRef<GlassFullScreenModalHandle>(null);
  const [loadError, setLoadError] = useState(false);
  // Remonta el WebView en cada reintento; recargar sobre el error no alcanza en iOS.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (visible) {
      setLoadError(false);
      setAttempt(0);
    }
  }, [visible, url]);

  const handleClose = () => {
    modalRef.current?.dismiss();
  };

  return (
    <GlassFullScreenModal
      ref={modalRef}
      visible={visible}
      onClose={onClose}
      scrollable={false}
      keyboardAvoiding={false}
      dismissOnBackdropPress={false}
      backdropAccessibilityLabel={t('common.close')}
      contentContainerStyle={styles.body}
      header={<GlassModalHeader title={title} onClose={handleClose} />}
    >
      {/* El View reclama el gesto para que el TouchableWithoutFeedback del shell
          no se coma los taps del WebView. */}
      <View style={styles.webviewHost} onStartShouldSetResponder={() => true}>
        {loadError ? (
          <View style={styles.errorBox}>
            <RNText style={styles.errorText}>{t('account.legalLoadError')}</RNText>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                setLoadError(false);
                setAttempt((n) => n + 1);
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <RNText style={styles.retryText}>{t('account.legalRetry')}</RNText>
            </TouchableOpacity>
          </View>
        ) : url ? (
          <WebView
            key={attempt}
            source={{ uri: url }}
            style={styles.webview}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loader}>
                <ActivityIndicator size="large" color={themeColors.primary} />
              </View>
            )}
            // Solo fallas de red/DNS: un 404 es una respuesta válida del servidor
            // y se muestra tal cual; Reintentar sobre un 404 nunca funcionaría.
            onError={() => setLoadError(true)}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['https://*', 'http://*']}
          />
        ) : null}
      </View>
    </GlassFullScreenModal>
  );
};

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  webviewHost: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#02050F',
  },
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  errorText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 15,
    lineHeight: 22,
    color: themeColors.glass.text,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 1000,
    backgroundColor: themeColors.primary,
  },
  retryText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
  },
});
