/**
 * Contacto — Figma 536-23051
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  Image,
  ActivityIndicator,
} from 'react-native';
import { AppTextInput } from '../../atoms/AppTextInput';
import { ImageUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { launchPhotoLibraryNow } from '../../../utils/mediaPicker';
import { deferMediaPicker } from '../../../utils/deferMediaPicker';
import {
  GlassFullScreenModal,
  type GlassFullScreenModalHandle,
} from '../profile/GlassFullScreenModal';
import { GlassModalHeader } from '../profile/GlassModalHeader';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { appAlert } from '../../../alerts';
import { createSupportTicket } from '../../../api/profileApi';
import { photoFromUri } from '../../../utils/mediaPicker';

const MAX_EVIDENCE = 4;

export interface ContactModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();
  const modalRef = useRef<GlassFullScreenModalHandle>(null);

  const [message, setMessage] = useState('');
  const [evidenceUris, setEvidenceUris] = useState<string[]>([]);
  const [interactionsReady, setInteractionsReady] = useState(false);
  const [sending, setSending] = useState(false);

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
    if (sending) {
      return;
    }
    modalRef.current?.dismiss();
  };

  const handlePickEvidence = () => {
    if (!interactionsReady || sending || evidenceUris.length >= MAX_EVIDENCE) {
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

  const handleSend = async () => {
    if (!message.trim() || sending) {
      if (!message.trim()) {
        appAlert(t('common.appName'), t('account.contactModal.messageRequired'));
      }
      return;
    }
    setSending(true);
    try {
      await createSupportTicket({
        message: message.trim(),
        evidence: evidenceUris.map((uri, index) =>
          photoFromUri(uri, `evidence-${index}.jpg`)
        ),
      });
      appAlert(t('common.appName'), t('account.contactModal.sendSuccess'));
      modalRef.current?.dismiss();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('account.contactModal.sendError');
      appAlert(t('common.appName'), msg);
    } finally {
      setSending(false);
    }
  };

  const canSend = message.trim().length > 0 && !sending;

  return (
    <GlassFullScreenModal
      ref={modalRef}
      visible={visible}
      onClose={onClose}
      backdropDelayMs={400}
      backdropAccessibilityLabel={t('account.contactModal.cancel')}
      dismissOnBackdropPress={false}
      scrollStyle={styles.contentScroll}
      contentContainerStyle={styles.contentScrollInner}
      header={
        <GlassModalHeader
          title={t('account.contactModal.title')}
          onClose={handleClose}
          closeDisabled={sending}
        />
      }
      footer={
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryBtn, !canSend && styles.primaryBtnDisabled]}
            onPress={() => {
              void handleSend();
            }}
            disabled={!canSend}
            activeOpacity={0.88}
          >
            {sending ? (
              <ActivityIndicator color={themeColors.glass.text} />
            ) : (
              <RNText style={styles.primaryBtnText}>
                {t('account.contactModal.send')}
              </RNText>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={12}
            activeOpacity={0.75}
            disabled={sending}
          >
            <RNText style={styles.cancelText}>{t('account.contactModal.cancel')}</RNText>
          </TouchableOpacity>
        </View>
      }
    >
              <View style={styles.fieldGroup}>
                <RNText style={styles.fieldLabel}>
                  {t('account.contactModal.messageLabel')}
                </RNText>
                <AppTextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder={t('account.contactModal.messagePlaceholder')}
                  placeholderTextColor={themeColors.glass.placeholder}
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
                        <ImageUp size={24} color={themeColors.glass.textMuted} strokeWidth={2} />
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
                          <ImageUp size={20} color={themeColors.glass.textMuted} strokeWidth={2} />
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
  contentScroll: {
    flex: 1,
  },
  contentScrollInner: {
    gap: 12,
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 10,
    lineHeight: 18,
    color: themeColors.glass.text,
    letterSpacing: 0.05,
    includeFontPadding: false,
  },
  messageInput: {
    minHeight: 147,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    backgroundColor: themeColors.glass.inputBg,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 20,
    color: themeColors.glass.text,
    letterSpacing: 0.06,
    includeFontPadding: false,
  },
  evidenceBox: {
    minHeight: 147,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    backgroundColor: themeColors.glass.inputBg,
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
    color: themeColors.glass.textMuted,
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
    borderColor: themeColors.glass.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    gap: 24,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  primaryBtn: {
    backgroundColor: themeColors.primary,
    borderRadius: 1000,
    height: 40,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryBtnDisabled: {
    opacity: themeColors.disabledOpacity,
  },
  primaryBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.text,
    includeFontPadding: false,
  },
  cancelText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.gold,
    includeFontPadding: false,
  },
});
