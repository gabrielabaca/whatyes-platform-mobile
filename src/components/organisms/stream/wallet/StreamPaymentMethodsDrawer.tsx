import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, CreditCard, Wallet } from 'lucide-react-native';
import { StreamBottomSheet, streamBottomPanelStyle, streamSheetStyles } from '../StreamBottomSheet';
import { SelectablePillRow, pillRowStyles } from '../../../molecules/stream';
import { FONT_FAMILY } from '../../../../theme/typography';
import { themeColors } from '../../../../theme/colors';
import type { SavedCard } from '../../../../api/paymentsApi';
import type { PreferredPaymentOrigin } from '../../../../utils/storage';

export interface StreamPaymentMethodsDrawerProps {
  visible: boolean;
  onClose: () => void;
  loading?: boolean;
  cards: SavedCard[];
  preferredOrigin: PreferredPaymentOrigin | null;
  /** Vincular MP se oculta mientras el backend no lo habilite (no deja nada cobrable). */
  showMpWallet?: boolean;
  onSelectMpWallet: () => void;
  onSelectCard: (card: SavedCard) => void;
  onDeleteCard: (card: SavedCard) => void;
  onAddCard: () => void;
}

/**
 * Aviso de caducidad para tarjetas que no quedaron card-on-file: su token vence a los
 * 7 días y, pasado ese punto, el cobro automático de la compra falla.
 */
function cardTokenWarning(card: SavedCard): { expired: boolean; days: number } | undefined {
  if (card.reusable !== false || !card.token_expires_at) return undefined;
  const days = Math.ceil((card.token_expires_at * 1000 - Date.now()) / 86_400_000);
  if (days <= 0) return { expired: true, days: 0 };
  if (days <= 3) return { expired: false, days };
  return undefined;
}

function cardBrandLabel(paymentMethodId: string): string {
  const id = paymentMethodId.toLowerCase();
  if (id.includes('visa')) return 'Visa';
  if (id.includes('master')) return 'Mastercard';
  if (id.includes('amex')) return 'Amex';
  return paymentMethodId;
}

export const StreamPaymentMethodsDrawer: React.FC<StreamPaymentMethodsDrawerProps> = ({
  visible,
  onClose,
  loading = false,
  cards,
  preferredOrigin,
  showMpWallet = false,
  onSelectMpWallet,
  onSelectCard,
  onDeleteCard,
  onAddCard,
}) => {
  const { t } = useTranslation();

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('stream.wallet.methodsTitle')}
      onClose={onClose}
      panelStyle={streamBottomPanelStyle}
      contentContainerStyle={styles.content}
    >
      {loading ? (
        <ActivityIndicator color={themeColors.glass.text} style={styles.loader} />
      ) : (
        <View style={styles.configSection}>
          {showMpWallet ? (
            <SelectablePillRow
              leading={<Wallet size={24} color={themeColors.glass.text} strokeWidth={2} />}
              title={t('stream.wallet.mpWalletTitle')}
              subtitle={t('stream.wallet.mpWalletSubtitle')}
              selected={preferredOrigin === 'MP_WALLET'}
              onPress={onSelectMpWallet}
            />
          ) : null}

          {cards.length === 0 ? (
            <RNText style={styles.empty}>{t('stream.wallet.noCards')}</RNText>
          ) : (
            cards.map((card) => {
              const isSelected =
                preferredOrigin === 'PLATFORM_CARD' && card.is_default;
              const title = [
                cardBrandLabel(card.payment_method_id),
                card.last_four ? `•••• ${card.last_four}` : '',
                card.is_default ? `(${t('stream.wallet.default')})` : '',
              ]
                .filter(Boolean)
                .join(' ');
              const expiry =
                card.expiration_month && card.expiration_year
                  ? `${String(card.expiration_month).padStart(2, '0')}/${String(card.expiration_year).slice(-2)}`
                  : undefined;
              // Sin card-on-file la tarjeta deja de ser cobrable a los 7 días: se avisa
              // antes de que el cobro automático falle (plan-cobro-tarjeta-y-wallet.md).
              const tokenWarning = cardTokenWarning(card);
              let subtitle = expiry;
              if (tokenWarning?.expired) {
                subtitle = t('stream.wallet.cardExpired');
              } else if (tokenWarning) {
                subtitle = t('stream.wallet.cardExpiringSoon', { count: tokenWarning.days });
              }

              return (
                <SelectablePillRow
                  key={card.uuid}
                  leading={<CreditCard size={24} color={themeColors.glass.text} strokeWidth={2} />}
                  title={title}
                  subtitle={subtitle}
                  selected={isSelected}
                  onPress={() => onSelectCard(card)}
                  onDelete={() => onDeleteCard(card)}
                />
              );
            })
          )}

          <View style={pillRowStyles.row}>
            <View style={pillRowStyles.left}>
              <Plus size={24} color={themeColors.glass.text} strokeWidth={2} />
              <RNText style={pillRowStyles.title}>{t('stream.wallet.addCard')}</RNText>
            </View>
            <TouchableOpacity
              style={[streamSheetStyles.primaryBtn, styles.actionBtn]}
              onPress={onAddCard}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <RNText style={streamSheetStyles.primaryBtnText}>{t('stream.wallet.add')}</RNText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </StreamBottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 24,
    width: '100%',
  },
  loader: {
    marginVertical: 24,
  },
  configSection: {
    width: '100%',
    gap: 16,
    paddingBottom: 8,
  },
  /** Acción dentro de la píldora: mismo botón primario, ancho al contenido. */
  actionBtn: {
    width: 'auto',
    minWidth: 80,
  },
  empty: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    lineHeight: 18,
    color: themeColors.glass.textSoft,
    paddingHorizontal: 8,
    includeFontPadding: false,
  },
});
