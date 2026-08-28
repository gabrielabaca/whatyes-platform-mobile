/**
 * Drawer del multiplicador de puja. No está en Figma: tres filas 1×/2×/3×
 * con el monto real que suma para el producto en pantalla. Un toque elige,
 * persiste y cierra — pensado para una subasta de 10 s, sin teclado ni scroll.
 *
 * Vive sobre el stream: `StreamBottomSheet` en OverlayPortal (nativeModal
 * default false en bottomPanel). No monta un Modal RN, el mismo patrón que
 * CountrySelect/AppOptionPickerSheet, el alta de dirección y DeletePaymentMethodModal.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet, streamBottomPanelStyle } from './StreamBottomSheet';
import { SelectablePillRow, PillRadio } from '../../molecules/stream/SelectablePillRow';
import { formatStreamPrice } from '../../atoms/stream/StreamPriceText';
import {
  BID_MULTIPLIERS,
  bidIncrementAmount,
  type BidMultiplier,
} from '../../../utils/bidIncrement';

export interface StreamBidIncrementDrawerProps {
  visible: boolean;
  onClose: () => void;
  /** Precio base en pesos enteros (ya convertido desde centavos). */
  floorMajor: number;
  multiplier: BidMultiplier;
  onSelect: (multiplier: BidMultiplier) => void;
}

export const StreamBidIncrementDrawer: React.FC<StreamBidIncrementDrawerProps> = ({
  visible,
  onClose,
  floorMajor,
  multiplier,
  onSelect,
}) => {
  const { t } = useTranslation();

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('stream.bidIncrementTitle')}
      onClose={onClose}
      panelStyle={streamBottomPanelStyle}
      scrollEnabled={false}
      nativeModal={false}
    >
      <View style={styles.list}>
        {BID_MULTIPLIERS.map((m) => {
          const amount = bidIncrementAmount(floorMajor, m);
          return (
            <SelectablePillRow
              key={m}
              leading={<PillRadio selected={multiplier === m} />}
              title={t('stream.bidIncrementOption', {
                multiplier: m,
                amount: formatStreamPrice(amount),
              })}
              selected={multiplier === m}
              showCheck={false}
              onPress={() => {
                onSelect(m);
                onClose();
              }}
            />
          );
        })}
      </View>
    </StreamBottomSheet>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: 8,
    width: '100%',
  },
});
