import React, { useEffect, useState } from 'react';
import {
  View,
  Text as RNText,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, PieChart } from 'lucide-react-native';
import { StreamBottomSheet } from '../stream/StreamBottomSheet';
import { PRODUCT_CONDITIONS, type ProductConditionId } from '../../../constants/productWeightPresets';
import { addProductStyles } from './addProductStyles';
import { StartLivePrimaryButton } from '../startLive/StartLivePrimitives';
import { startLivePanelStyle } from '../startLive/startLiveStyles';

export interface AddProductConditionDrawerProps {
  visible: boolean;
  initialValue?: ProductConditionId | null;
  onClose: () => void;
  onConfirm: (value: ProductConditionId) => void;
}

/** Figma 536-27743 */
export const AddProductConditionDrawer: React.FC<AddProductConditionDrawerProps> = ({
  visible,
  initialValue,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<ProductConditionId | null>(initialValue ?? null);
  const panelStyle: StyleProp<ViewStyle> = [startLivePanelStyle, { paddingTop: 28 }];

  useEffect(() => {
    if (visible) {
      setSelected(initialValue ?? null);
    }
  }, [visible, initialValue]);

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('addProduct.conditionTitle')}
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
      <View style={addProductStyles.conditionList}>
        {PRODUCT_CONDITIONS.map((opt) => {
          const on = selected === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[addProductStyles.conditionRow, on && addProductStyles.conditionRowOn]}
              onPress={() => setSelected(opt.id)}
              activeOpacity={0.85}
            >
              <View style={addProductStyles.conditionLeft}>
                <View style={addProductStyles.conditionIcon}>
                  <PieChart size={18} color="#18181B" strokeWidth={2} />
                </View>
                <RNText style={addProductStyles.conditionLabel}>{t(opt.labelKey)}</RNText>
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
