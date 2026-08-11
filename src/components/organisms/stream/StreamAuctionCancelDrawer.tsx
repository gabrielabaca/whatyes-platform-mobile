/**
 * Drawer "Cancelar subasta" del vendedor (tarea 18).
 *
 * Se abre con la oferta YA pausada por el caller (timer congelado, sin pujas):
 * acá solo se elige el motivo (selección única) y se completa el detalle
 * interno. Confirmar cancela; cerrar (X o "Volver a la subasta") desiste y el
 * caller reanuda desde el tiempo restante.
 *
 * El viewer nunca ve este contenido: recibe únicamente el mensaje genérico del
 * código elegido (`auctionCancelledMessageKey`).
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text as RNText,
} from 'react-native';
import { AppTextInput } from '../../atoms/AppTextInput';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet, streamBottomPanelStyle, streamSheetStyles } from './StreamBottomSheet';
import {
  AUCTION_CANCEL_DETAILS_MAX_LENGTH,
  type AuctionCancelReasonCode,
} from '../../../api/platformApi';
import { STREAM_COLORS } from '../../molecules/stream/streamTokens';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';

/** Motivos que ve el vendedor, en el orden de la tabla de la tarea 18.
 * Literales (`as const`) para que `t()` los acepte como claves tipadas. */
export const AUCTION_CANCEL_REASONS = [
  { code: 'product_issue', labelKey: 'stream.auctionCancelReasonProductIssue' },
  { code: 'listing_error', labelKey: 'stream.auctionCancelReasonListingError' },
  { code: 'technical_issue', labelKey: 'stream.auctionCancelReasonTechnicalIssue' },
] as const satisfies ReadonlyArray<{ code: AuctionCancelReasonCode; labelKey: string }>;

/**
 * Mensaje genérico que ven los viewers para cada código. Ante un código
 * desconocido (backend más nuevo que la app) cae al de inconveniente técnico,
 * el único que no afirma nada sobre el producto ni la publicación.
 */
export function auctionCancelledMessageKey(
  reasonCode: string,
):
  | 'stream.auctionCancelledProductIssue'
  | 'stream.auctionCancelledListingError'
  | 'stream.auctionCancelledTechnicalIssue' {
  switch (reasonCode) {
    case 'product_issue':
      return 'stream.auctionCancelledProductIssue';
    case 'listing_error':
      return 'stream.auctionCancelledListingError';
    default:
      return 'stream.auctionCancelledTechnicalIssue';
  }
}

export interface StreamAuctionCancelDrawerProps {
  visible: boolean;
  /** Desistir: el caller reanuda la subasta desde el restante pausado. */
  onClose: () => void;
  /** Confirmar la cancelación con motivo + detalle interno. */
  onConfirm: (reasonCode: AuctionCancelReasonCode, details: string) => void;
  /** Cancelación en vuelo: bloquea acciones hasta que el backend resuelva. */
  confirmPending?: boolean;
}

export const StreamAuctionCancelDrawer: React.FC<StreamAuctionCancelDrawerProps> = ({
  visible,
  onClose,
  onConfirm,
  confirmPending = false,
}) => {
  const { t } = useTranslation();
  const [reasonCode, setReasonCode] = useState<AuctionCancelReasonCode | null>(null);
  const [details, setDetails] = useState('');

  // Cada apertura arranca limpia: el motivo de una cancelación anterior no
  // debe quedar preseleccionado.
  useEffect(() => {
    if (visible) {
      setReasonCode(null);
      setDetails('');
    }
  }, [visible]);

  const canConfirm = reasonCode !== null && details.trim().length > 0 && !confirmPending;

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('stream.auctionCancelTitle')}
      onClose={onClose}
      panelStyle={streamBottomPanelStyle}
      contentContainerStyle={styles.content}
      // Formulario que además tiene la subasta pausada: desistir debe ser un
      // gesto explícito (X o "Volver a la subasta"), no un roce del fondo.
      dismissOnBackdropPress={false}
      cancelLabel={t('stream.auctionCancelKeepCta')}
      onCancelPress={confirmPending ? undefined : onClose}
      footer={
        <TouchableOpacity
          style={[styles.confirmBtn, !canConfirm && styles.btnDisabled]}
          onPress={() => {
            if (reasonCode) onConfirm(reasonCode, details.trim());
          }}
          disabled={!canConfirm}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          {confirmPending ? (
            <ActivityIndicator color={STREAM_COLORS.white} size="small" />
          ) : (
            <RNText style={streamSheetStyles.primaryBtnText}>
              {t('stream.auctionCancelConfirmCta')}
            </RNText>
          )}
        </TouchableOpacity>
      }
    >
      <RNText style={styles.subtitle}>{t('stream.auctionCancelSubtitle')}</RNText>

      <View style={styles.reasonList}>
        {AUCTION_CANCEL_REASONS.map(({ code, labelKey }) => {
          const selected = reasonCode === code;
          return (
            <TouchableOpacity
              key={code}
              style={styles.reasonRow}
              onPress={() => setReasonCode(code)}
              disabled={confirmPending}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                {selected ? <View style={styles.radioInner} /> : null}
              </View>
              <RNText style={[styles.reasonLabel, selected && styles.reasonLabelSelected]}>
                {t(labelKey)}
              </RNText>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.detailsBlock}>
        <RNText style={streamSheetStyles.sectionLabel}>
          {t('stream.auctionCancelDetailsLabel')}
        </RNText>
        <AppTextInput
          style={styles.detailsInput}
          value={details}
          onChangeText={setDetails}
          placeholder={t('stream.auctionCancelDetailsPlaceholder')}
          placeholderTextColor={themeColors.glass.textMuted}
          multiline
          textAlignVertical="top"
          maxLength={AUCTION_CANCEL_DETAILS_MAX_LENGTH}
          editable={!confirmPending}
          accessibilityLabel={t('stream.auctionCancelDetailsLabel')}
        />
        <RNText style={styles.detailsHint}>{t('stream.auctionCancelDetailsHint')}</RNText>
      </View>
    </StreamBottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 16,
    width: '100%',
  },
  subtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.textMuted,
    includeFontPadding: false,
  },
  reasonList: {
    gap: 12,
    width: '100%',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: themeColors.glass.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: STREAM_COLORS.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: STREAM_COLORS.primary,
  },
  reasonLabel: {
    flex: 1,
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.textMuted,
    includeFontPadding: false,
  },
  reasonLabelSelected: {
    color: themeColors.glass.text,
  },
  detailsBlock: {
    gap: 8,
    width: '100%',
  },
  detailsInput: {
    minHeight: 84,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: STREAM_COLORS.chatInputBorder,
    backgroundColor: STREAM_COLORS.chatInputBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.text,
    includeFontPadding: false,
  },
  detailsHint: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: themeColors.glass.textSoft,
    includeFontPadding: false,
  },
  confirmBtn: {
    ...streamSheetStyles.primaryBtn,
    backgroundColor: themeColors.danger,
  },
  btnDisabled: {
    opacity: themeColors.disabledOpacity,
  },
});
