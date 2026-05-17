/**
 * Contacto — Figma 536-23051
 * UI completa; envío al backend pendiente.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Text as RNText,
  Animated,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { X, ImageUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { GlassBackdrop } from '../profile/GlassBackdrop';
import { FONT_FAMILY } from '../../../theme/typography';

const PRIMARY = '#685CF0';
const CANCEL_GOLD = '#FDC700';
const MAX_EVIDENCE = 4;

export interface ContactModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(1)).current;

  const [message, setMessage] = useState('');
  const [evidenceUris, setEvidenceUris] = useState<string[]>([]);
  const [backdropReady, setBackdropReady] = useState(false);
  const [interactionsReady, setInteractionsReady] = useState(false);

  const resetState = useCallback(() => {
    setMessage('');
    setEvidenceUris([]);
  }, []);

  useEffect(() => {
    if (!visible) {
      setBackdropReady(false);
      setInteractionsReady(false);
      return;
    }
    resetState();
    slideAnim.setValue(1);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
    const backdropTimer = setTimeout(() => setBackdropReady(true), 400);
    const interactionsTimer = setTimeout(() => setInteractionsReady(true), 500);
    return () => {
      clearTimeout(backdropTimer);
      clearTimeout(interactionsTimer);
    };
  }, [visible, resetState, slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onClose();
      }
    });
  };

  const handlePickEvidence = () => {
    if (!interactionsReady || evidenceUris.length >= MAX_EVIDENCE) {
      return;
    }
    launchImageLibrary(
      { mediaType: 'photo', selectionLimit: MAX_EVIDENCE - evidenceUris.length },
      (response) => {
        if (response.didCancel || response.errorMessage) {
          return;
        }
        const uris =
          response.assets
            ?.map((asset) => asset.uri)
            .filter((uri): uri is string => Boolean(uri)) ?? [];
        if (uris.length === 0) {
          return;
        }
        setEvidenceUris((prev) => [...prev, ...uris].slice(0, MAX_EVIDENCE));
      }
    );
  };

  const handleSend = () => {
    if (!message.trim()) {
      Alert.alert(t('common.appName'), t('account.contactModal.messageRequired'));
      return;
    }
    Alert.alert(t('common.appName'), t('account.contactModal.sendNotAvailable'));
  };

  if (!visible) {
    return null;
  }

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 800],
  });

  const canSend = message.trim().length > 0;

  return (
    <View style={styles.host} pointerEvents="box-none">
      <GlassBackdrop />
      <TouchableOpacity
        style={styles.backdropPress}
        activeOpacity={1}
        onPress={backdropReady ? handleClose : undefined}
        disabled={!backdropReady}
        accessibilityRole="button"
        accessibilityLabel={t('account.contactModal.cancel')}
      />

      <Animated.View
        style={[styles.sheet, { transform: [{ translateY }] }]}
        pointerEvents="box-none"
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.container,
              { paddingTop: insets.top + 16, paddingBottom: insets.bottom },
            ]}
          >
            <View style={styles.header}>
              <RNText style={styles.title}>{t('account.contactModal.title')}</RNText>
              <TouchableOpacity onPress={handleClose} hitSlop={12}>
                <X size={22} color="#FFFFFF" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.contentScroll}
              contentContainerStyle={styles.contentScrollInner}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.fieldGroup}>
                <RNText style={styles.fieldLabel}>
                  {t('account.contactModal.messageLabel')}
                </RNText>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder={t('account.contactModal.messagePlaceholder')}
                  placeholderTextColor="#D8D8D8"
                  style={styles.messageInput}
                  multiline
                  textAlignVertical="top"
                  autoCapitalize="sentences"
                />
              </View>

              <View style={styles.fieldGroup}>
                <RNText style={styles.fieldLabel}>
                  {t('account.contactModal.evidenceLabel')}
                </RNText>
                <View style={styles.evidenceBox}>
                  {evidenceUris.length === 0 ? (
                    <>
                      <RNText style={styles.evidenceHint}>
                        {t('account.contactModal.evidenceHint')}
                      </RNText>
                      <TouchableOpacity
                        onPress={handlePickEvidence}
                        activeOpacity={0.85}
                        disabled={!interactionsReady}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel={t('account.contactModal.addEvidence')}
                      >
                        <ImageUp size={24} color="#D8D8D8" strokeWidth={2} />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={styles.evidencePreviewRow}>
                      {evidenceUris.map((uri) => (
                        <Image key={uri} source={{ uri }} style={styles.evidenceThumb} />
                      ))}
                      {evidenceUris.length < MAX_EVIDENCE ? (
                        <TouchableOpacity
                          style={styles.evidenceAddMore}
                          onPress={handlePickEvidence}
                          activeOpacity={0.85}
                          disabled={!interactionsReady}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel={t('account.contactModal.addEvidence')}
                        >
                          <ImageUp size={20} color="#D8D8D8" strokeWidth={2} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.primaryBtn, !canSend && styles.primaryBtnDisabled]}
                onPress={handleSend}
                disabled={!canSend}
                activeOpacity={0.88}
              >
                <RNText style={styles.primaryBtnText}>
                  {t('account.contactModal.send')}
                </RNText>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClose} hitSlop={12} activeOpacity={0.75}>
                <RNText style={styles.cancelText}>{t('account.contactModal.cancel')}</RNText>
              </TouchableOpacity>
            </View>

            <View style={styles.homeIndicator}>
              <View style={styles.homeIndicatorBar} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 300,
    elevation: 300,
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  sheet: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    flex: 1,
    includeFontPadding: false,
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollInner: {
    gap: 12,
    flexGrow: 1,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    lineHeight: 18,
    color: '#FFFFFF',
    letterSpacing: 0.05,
    includeFontPadding: false,
  },
  messageInput: {
    minHeight: 147,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: 'rgba(236, 235, 235, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 20,
    color: '#FFFFFF',
    letterSpacing: 0.06,
    includeFontPadding: false,
  },
  evidenceBox: {
    minHeight: 147,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: 'rgba(236, 235, 235, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  evidenceHint: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 20,
    color: '#D8D8D8',
    textAlign: 'center',
    letterSpacing: 0.06,
    includeFontPadding: false,
  },
  evidencePreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
  },
  evidenceThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  evidenceAddMore: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    gap: 24,
    alignItems: 'center',
    width: '100%',
  },
  primaryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 1000,
    height: 40,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  cancelText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: CANCEL_GOLD,
    includeFontPadding: false,
  },
  homeIndicator: {
    alignItems: 'center',
    height: 31,
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  homeIndicatorBar: {
    width: 134,
    height: 5,
    borderRadius: 100,
    backgroundColor: '#C7C8CA',
  },
});
