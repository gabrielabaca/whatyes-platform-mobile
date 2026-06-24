import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, Check, CreditCard, Wallet } from 'lucide-react-native';
import { StreamBottomSheet, streamBottomPanelStyle } from '../StreamBottomSheet';
import { FONT_FAMILY } from '../../../../theme/typography';
import type { SavedCard } from '../../../../api/paymentsApi';
import type { PreferredPaymentOrigin } from '../../../../utils/storage';

export interface StreamPaymentMethodsDrawerProps {
  visible: boolean;
  onClose: () => void;
  loading?: boolean;
  cards: SavedCard[];
  preferredOrigin: PreferredPaymentOrigin | null;
  onSelectMpWallet: () => void;
  onSelectCard: (card: SavedCard) => void;
  onAddCard: () => void;
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
  onSelectMpWallet,
  onSelectCard,
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
        <ActivityIndicator color="#FFFFFF" style={styles.loader} />
      ) : (
        <View style={styles.configSection}>
          <MethodPillRow
            icon={<Wallet size={24} color="#02050F" strokeWidth={2} />}
            title={t('stream.wallet.mpWalletTitle')}
            subtitle={t('stream.wallet.mpWalletSubtitle')}
            selected={preferredOrigin === 'MP_WALLET'}
            onPress={onSelectMpWallet}
          />

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
              const subtitle =
                card.expiration_month && card.expiration_year
                  ? `${String(card.expiration_month).padStart(2, '0')}/${String(card.expiration_year).slice(-2)}`
                  : undefined;

              return (
                <MethodPillRow
                  key={card.uuid}
                  icon={<CreditCard size={24} color="#02050F" strokeWidth={2} />}
                  title={title}
                  subtitle={subtitle}
                  selected={isSelected}
                  onPress={() => onSelectCard(card)}
                />
              );
            })
          )}

          <View style={styles.pillRow}>
            <View style={styles.pillLeft}>
              <Plus size={24} color="#02050F" strokeWidth={2} />
              <RNText style={styles.pillTitle}>{t('stream.wallet.addCard')}</RNText>
            </View>
            <TouchableOpacity style={styles.actionBtn} onPress={onAddCard} activeOpacity={0.85}>
              <RNText style={styles.actionBtnText}>{t('stream.wallet.add')}</RNText>
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
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.pillRow, selected && styles.pillRowSelected]}
      onPress={onPress}
      activeOpacity={0.85}
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
      {selected ? <Check size={22} color="#685CF0" strokeWidth={2.5} /> : null}
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
    backgroundColor: '#C9C9C9',
    borderWidth: 1,
    borderColor: 'rgba(221, 221, 221, 0.87)',
    borderRadius: 1000,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
    minHeight: 64,
  },
  pillRowSelected: {
    borderColor: '#685CF0',
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
    color: '#02050F',
    letterSpacing: 0.08,
    includeFontPadding: false,
  },
  pillSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(2, 5, 15, 0.65)',
    includeFontPadding: false,
  },
  actionBtn: {
    height: 40,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 1000,
    backgroundColor: '#685CF0',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  actionBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  empty: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 8,
    includeFontPadding: false,
  },
});
