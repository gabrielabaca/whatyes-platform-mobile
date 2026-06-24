import React, { useEffect, useState } from 'react';
import {
  View,
  Text as RNText,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, Package, PackageOpen } from 'lucide-react-native';
import { StreamBottomSheet } from '../stream/StreamBottomSheet';
import {
  SALE_FORMAT_OPTIONS,
  type SaleFormatId,
} from '../../../constants/productWeightPresets';
import { addProductStyles } from './addProductStyles';
import { StartLivePrimaryButton } from '../startLive/StartLivePrimitives';
import { startLivePanelStyle } from '../startLive/startLiveStyles';

export interface AddProductSaleFormatDrawerProps {
  visible: boolean;
  initialValue?: SaleFormatId | null;
  onClose: () => void;
  onConfirm: (value: SaleFormatId) => void;
}

/** Formato de venta del producto: pieza individual o lote. */
export const AddProductSaleFormatDrawer: React.FC<AddProductSaleFormatDrawerProps> = ({
  visible,
  initialValue,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<SaleFormatId | null>(initialValue ?? null);
  const panelStyle: StyleProp<ViewStyle> = [startLivePanelStyle, { paddingTop: 28 }];

  useEffect(() => {
    if (visible) {
      setSelected(initialValue ?? null);
    }
  }, [visible, initialValue]);

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('addProduct.saleFormatTitle')}
      onClose={onClose}
      bottomPanel
      panelStyle={panelStyle}
      contentContainerStyle={addProductStyles.drawerBody}
      footer={
        <StartLivePrimaryButton
          label={t('addProduct.confirm')}
          onPress={() => selected && onConfirm(selected)}
          disabled={!selected}
        />
      }
    >
      <RNText style={addProductStyles.drawerHint}>{t('addProduct.saleFormatSelectHint')}</RNText>

      <View style={addProductStyles.conditionList}>
        {SALE_FORMAT_OPTIONS.map((opt) => {
          const on = selected === opt.id;
          const Icon = opt.id === 'individual' ? Package : PackageOpen;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[addProductStyles.conditionRow, on && addProductStyles.conditionRowOn]}
              onPress={() => setSelected(opt.id)}
              activeOpacity={0.85}
            >
              <View style={addProductStyles.conditionLeft}>
                <View style={addProductStyles.conditionIcon}>
                  <Icon size={18} color="#18181B" strokeWidth={2} />
                </View>
                <View style={addProductStyles.saleFormatTextCol}>
                  <RNText style={addProductStyles.conditionLabel}>{t(opt.labelKey)}</RNText>
                  <RNText style={addProductStyles.photoOptionHint}>{t(opt.hintKey)}</RNText>
                </View>
              </View>
              <View style={[addProductStyles.conditionCheck, on && addProductStyles.conditionCheckOn]}>
                {on ? <Check size={12} color="#FFFFFF" strokeWidth={3} /> : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </StreamBottomSheet>
  );
};
