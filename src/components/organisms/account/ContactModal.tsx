/**
 * Contacto — Figma 536-23051
 * Envío a service-platform (POST /me/support-tickets).
 *
 * La confirmación y el error se muestran DENTRO del modal, no con `appAlert`: el
 * alert es un `Modal` nativo, y abrirlo mientras este modal se desmonta dejaba una
 * capa huérfana que se tragaba todos los toques de la app.
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
import { CircleCheck, ImageUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
  launchPhotoLibraryNow,
  photosFromPickerResponse,
  type PickerPhoto,
} from '../../../utils/mediaPicker';
import { deferMediaPicker } from '../../../utils/deferMediaPicker';
import {
  GlassFullScreenModal,
  type GlassFullScreenModalHandle,
} from '../profile/GlassFullScreenModal';
import { GlassModalHeader } from '../profile/GlassModalHeader';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { createSupportTicket } from '../../../api/platformApi';
import { ApiError } from '../../../api/authApi';

const MAX_EVIDENCE = 4;

export interface ContactModalProps {
  visible: boolean;
  onClose: () => void;
  /** Prefill del mensaje (p. ej. número de compra). Se aplica al abrir. */
  initialMessage?: string;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  visible,
  onClose,
  initialMessage,
}) => {
  const { t } = useTranslation();
  const modalRef = useRef<GlassFullScreenModalHandle>(null);

  const [message, setMessage] = useState('');
  const [evidence, setEvidence] = useState<PickerPhoto[]>([]);
  const [interactionsReady, setInteractionsReady] = useState(false);
  const [sending, setSending] = useState(false);
  /** El ticket ya se creó: el cuerpo pasa a la confirmación y el CTA a "Listo". */
  const [sent, setSent] = useState(false);
  /** Error del último envío; se limpia al editar el mensaje. */
  const [errorText, setErrorText] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setMessage('');
    setEvidence([]);
    setSending(false);
    setSent(false);
    setErrorText(null);
  }, []);

  useEffect(() => {
    if (!visible) {
      setInteractionsReady(false);
      return;
    }
    resetState();
    if (initialMessage) {
      setMessage(initialMessage);
    }
    const interactionsTimer = setTimeout(() => setInteractionsReady(true), 500);
    return () => clearTimeout(interactionsTimer);
  }, [visible, resetState, initialMessage]);

  const handleClose = () => {
    if (sending) {
      return;
    }
    modalRef.current?.dismiss();
  };

  const handlePickEvidence = () => {
    if (!interactionsReady || sending || evidence.length >= MAX_EVIDENCE) {
      return;
    }
    deferMediaPicker(() => {
      launchPhotoLibraryNow(
        { mediaType: 'photo', selectionLimit: MAX_EVIDENCE - evidence.length },
        (response) => {
          const photos = photosFromPickerResponse(response);
          if (photos.length === 0) {
            return;
          }
          setEvidence((prev) => [...prev, ...photos].slice(0, MAX_EVIDENCE));
        },
      );
    });
  };

  const handleChangeMessage = (text: string) => {
    setMessage(text);
    if (errorText) {
      setErrorText(null);
    }
  };

  const handleSend = async () => {
    if (sending || sent) {
      return;
    }
    const body = message.trim();
    if (!body) {
      setErrorText(t('account.contactModal.messageRequired'));
      return;
    }
    setSending(true);
    setErrorText(null);
    try {
      await createSupportTicket({ message: body, evidence });
      setSent(true);
    } catch (error) {
      const fallback = t('account.contactModal.sendError');
      const detail = error instanceof ApiError ? error.message : fallback;
      setErrorText(detail || fallback);
    } finally {
      setSending(false);
    }
  };

  const canSend = message.trim().length > 0 && !sending;

  const footer = sent ? (
    <View style={styles.footer}>
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => modalRef.current?.dismiss()}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={t('common.done')}
      >
        <RNText style={styles.primaryBtnText}>{t('common.done')}</RNText>
      </TouchableOpacity>
    </View>
  ) : (
    <View style={styles.footer}>
      <TouchableOpacity
        style={[styles.primaryBtn, !canSend && styles.primaryBtnDisabled]}
        onPress={handleSend}
        disabled={!canSend}
        activeOpacity={0.88}
        accessibilityLabel={
          sending
            ? t('account.contactModal.sending')
            : t('account.contactModal.send')
        }
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
  );

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
      footer={footer}
    >
      {sent ? (
        <View style={styles.successBox} accessibilityLiveRegion="polite">
          <View style={styles.successIconWrap}>
            <CircleCheck size={28} color={themeColors.success} strokeWidth={2.2} />
          </View>
          <RNText style={styles.successTitle}>
            {t('account.contactModal.sentTitle')}
          </RNText>
          <RNText style={styles.successBody}>
            {t('account.contactModal.sendSuccess')}
          </RNText>
        </View>
      ) : (
        <>
              <View style={styles.fieldGroup}>
                <RNText style={styles.fieldLabel}>
                  {t('account.contactModal.messageLabel')}
                </RNText>
                <AppTextInput
                  value={message}
                  onChangeText={handleChangeMessage}
                  placeholder={t('account.contactModal.messagePlaceholder')}
                  placeholderTextColor={themeColors.glass.placeholder}
                  style={styles.messageInput}
                  multiline
                  textAlignVertical="top"
                  autoCapitalize="sentences"
                  editable={!sending}
                />
              </View>

              <View style={styles.fieldGroup}>
                <RNText style={styles.fieldLabel}>
                  {t('account.contactModal.evidenceLabel')}
                </RNText>
                <View style={styles.evidenceBox}>
                  {evidence.length === 0 ? (
                    <>
                      <RNText style={styles.evidenceHint}>
                        {t('account.contactModal.evidenceHint')}
                      </RNText>
                      <TouchableOpacity
                        onPress={handlePickEvidence}
                        activeOpacity={0.85}
                        disabled={!interactionsReady || sending}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel={t('account.contactModal.addEvidence')}
                      >
                        <ImageUp size={24} color={themeColors.glass.textMuted} strokeWidth={2} />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={styles.evidencePreviewRow}>
                      {evidence.map((photo) => (
                        <Image key={photo.uri} source={{ uri: photo.uri }} style={styles.evidenceThumb} />
                      ))}
                      {evidence.length < MAX_EVIDENCE ? (
                        <TouchableOpacity
                          style={styles.evidenceAddMore}
                          onPress={handlePickEvidence}
                          activeOpacity={0.85}
                          disabled={!interactionsReady || sending}
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

              {errorText ? (
                <RNText style={styles.errorText} accessibilityLiveRegion="polite">
                  {errorText}
                </RNText>
              ) : null}
        </>
      )}
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
  errorText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 18,
    color: themeColors.danger,
    letterSpacing: 0.05,
    includeFontPadding: false,
  },
  successBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 32,
  },
  successIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${themeColors.success}22`,
    marginBottom: 8,
  },
  successTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 17,
    lineHeight: 24,
    color: themeColors.glass.text,
    textAlign: 'center',
    includeFontPadding: false,
  },
  successBody: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.textMuted,
    textAlign: 'center',
    includeFontPadding: false,
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
