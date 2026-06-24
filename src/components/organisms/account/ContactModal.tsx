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
  Alert,
  Image,
} from 'react-native';
import { X, ImageUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchPhotoLibraryNow } from '../../../utils/mediaPicker';
import { deferMediaPicker } from '../../../utils/deferMediaPicker';
import {
  GlassFullScreenModal,
  type GlassFullScreenModalHandle,
} from '../profile/GlassFullScreenModal';
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
  const modalRef = useRef<GlassFullScreenModalHandle>(null);

  const [message, setMessage] = useState('');
  const [evidenceUris, setEvidenceUris] = useState<string[]>([]);
  const [interactionsReady, setInteractionsReady] = useState(false);

  const resetState = useCallback(() => {
    setMessage('');
    setEvidenceUris([]);
  }, []);

  useEffect(() => {
    if (!visible) {
      setInteractionsReady(false);
      return;
    }
    resetState();
    const interactionsTimer = setTimeout(() => setInteractionsReady(true), 500);
    return () => clearTimeout(interactionsTimer);
  }, [visible, resetState]);

  const handleClose = () => {
    modalRef.current?.dismiss();
  };

  const handlePickEvidence = () => {
    if (!interactionsReady || evidenceUris.length >= MAX_EVIDENCE) {
      return;
    }
    deferMediaPicker(() => {
      launchPhotoLibraryNow(
        { mediaType: 'photo', selectionLimit: MAX_EVIDENCE - evidenceUris.length },
        (response) => {
          const uris =
            response.assets
              ?.map((asset) => asset.uri)
              .filter((uri): uri is string => Boolean(uri)) ?? [];
          if (uris.length === 0) {
            return;
          }
          setEvidenceUris((prev) => [...prev, ...uris].slice(0, MAX_EVIDENCE));
        },
      );
    });
  };

  const handleSend = () => {
    if (!message.trim()) {
      Alert.alert(t('common.appName'), t('account.contactModal.messageRequired'));
      return;
    }
    Alert.alert(t('common.appName'), t('account.contactModal.sendNotAvailable'));
  };

  const canSend = message.trim().length > 0;

  return (
    <GlassFullScreenModal
      ref={modalRef}
      visible={visible}
      onClose={onClose}
      backdropDelayMs={400}
      backdropAccessibilityLabel={t('account.contactModal.cancel')}
      containerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
      scrollStyle={styles.contentScroll}
      contentContainerStyle={styles.contentScrollInner}
      header={
        <View style={styles.header}>
          <RNText style={styles.title}>{t('account.contactModal.title')}</RNText>
          <TouchableOpacity onPress={handleClose} hitSlop={12}>
            <X size={22} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      }
      footer={
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
      }
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
    </GlassFullScreenModal>
  );
};

const styles = StyleSheet.create({
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
});
