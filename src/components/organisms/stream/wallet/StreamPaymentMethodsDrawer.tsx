import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, Check, CreditCard, Trash2, Wallet } from 'lucide-react-native';
import { StreamBottomSheet, streamBottomPanelStyle, streamSheetStyles } from '../StreamBottomSheet';
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
            <MethodPillRow
              icon={<Wallet size={24} color={themeColors.glass.text} strokeWidth={2} />}
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
                <MethodPillRow
                  key={card.uuid}
                  icon={<CreditCard size={24} color={themeColors.glass.text} strokeWidth={2} />}
                  title={title}
                  subtitle={subtitle}
                  selected={isSelected}
                  onPress={() => onSelectCard(card)}
                  onDelete={() => onDeleteCard(card)}
                />
              );
            })
          )}

          <View style={styles.pillRow}>
            <View style={styles.pillLeft}>
              <Plus size={24} color={themeColors.glass.text} strokeWidth={2} />
              <RNText style={styles.pillTitle}>{t('stream.wallet.addCard')}</RNText>
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

function MethodPillRow({
  icon,
  title,
  subtitle,
  selected,
  onPress,
  onDelete,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  onDelete?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.pillRow, selected && styles.pillRowSelected]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
    >
      <View style={styles.pillLeft}>
        {icon}
        <View style={styles.pillTextCol}>
          <RNText style={styles.pillTitle} numberOfLines={2}>
            {title}
          </RNText>
          {subtitle ? (
            <RNText style={styles.pillSubtitle} numberOfLines={1}>
              {subtitle}
            </RNText>
          ) : null}
        </View>
      </View>
      {selected ? <Check size={22} color={themeColors.primary} strokeWidth={2.5} /> : null}
      {onDelete ? (
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={10}
          style={styles.deleteBtn}
          accessibilityRole="button"
        >
          <Trash2 size={18} color={themeColors.glass.textSoft} strokeWidth={2} />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

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
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: themeColors.glass.rowBg,
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    borderRadius: 1000,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
    minHeight: 64,
  },
  pillRowSelected: {
    borderColor: themeColors.primary,
    borderWidth: 2,
  },
  pillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  pillTextCol: {
    flex: 1,
    gap: 2,
  },
  pillTitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: themeColors.glass.text,
    letterSpacing: 0.08,
    includeFontPadding: false,
  },
  pillSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: themeColors.glass.textSoft,
    includeFontPadding: false,
  },
  /** Tocable aparte dentro de la fila: eliminar no puede confundirse con seleccionar. */
  deleteBtn: {
    marginLeft: 8,
    padding: 6,
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
