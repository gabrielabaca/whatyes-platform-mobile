import React, { useEffect, useState } from 'react';
import {
  View,
  Text as RNText,
  TextInput,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet } from '../stream/StreamBottomSheet';
import {
  PACKAGE_TIER_OPTIONS,
  type PackageTierId,
} from '../../../constants/productWeightPresets';
import { addProductStyles } from './addProductStyles';
import { StartLivePrimaryButton } from '../startLive/StartLivePrimitives';
import { startLivePanelStyle } from '../startLive/startLiveStyles';

export interface AddProductPackageTierDrawerProps {
  visible: boolean;
  initialTier?: PackageTierId | null;
  initialManualKg?: string;
  onClose: () => void;
  onConfirm: (tier: PackageTierId, weightKg: number | null) => void;
}

/** Figma 567-3931 — formato de venta / tamaño de paquete */
export const AddProductPackageTierDrawer: React.FC<AddProductPackageTierDrawerProps> = ({
  visible,
  initialTier,
  initialManualKg,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [tier, setTier] = useState<PackageTierId | null>(initialTier ?? null);
  const [manualValue, setManualValue] = useState('');
  const panelStyle: StyleProp<ViewStyle> = [startLivePanelStyle, { paddingTop: 28 }];

  useEffect(() => {
    if (visible) {
      setTier(initialTier ?? null);
      const initialWeight = parseFloat((initialManualKg ?? '').replace(',', '.'));
      if (Number.isFinite(initialWeight) && initialWeight > 0) {
        setManualValue(initialTier === 'light' ? String(Math.round(initialWeight * 1000)) : String(initialWeight));
      } else {
        setManualValue('');
      }
    }
  }, [visible, initialTier, initialManualKg]);

  const selectedOption = PACKAGE_TIER_OPTIONS.find((o) => o.id === tier);
  const manualUnit = tier === 'light' ? 'g' : 'Kg';
  const manualPlaceholder = tier === 'light' ? '150' : '1.5';
  const manualMax = tier === 'light' ? 250 : tier === 'medium' ? 5 : tier === 'heavy' ? 20 : 30;

  const parseManualWeightKg = (): number | null => {
    const trimmed = manualValue.trim();
    if (!trimmed) return null;
    const parsed = parseFloat(trimmed.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > manualMax) return null;
    return manualUnit === 'g' ? parsed / 1000 : parsed;
  };

  const handleConfirm = () => {
    if (!tier) return;
    const manualWeightKg = parseManualWeightKg();
    if (manualValue.trim() && manualWeightKg == null) {
      return;
    }
    onConfirm(tier, manualWeightKg ?? selectedOption?.defaultKg ?? null);
  };

  const canConfirm =
    tier != null && (!manualValue.trim() || parseManualWeightKg() != null);

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('addProduct.weightTitle')}
      onClose={onClose}
      dismissOnBackdropPress={false}
      bottomPanel
      panelStyle={panelStyle}
      contentContainerStyle={addProductStyles.drawerBody}
      footer={
        <StartLivePrimaryButton
          label={t('addProduct.confirm')}
          onPress={handleConfirm}
          disabled={!canConfirm}
        />
      }
    >
      <RNText style={addProductStyles.drawerHint}>{t('addProduct.weightPackageHint')}</RNText>

      <View style={addProductStyles.tierList}>
        {PACKAGE_TIER_OPTIONS.map((opt) => {
          const selected = tier === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={addProductStyles.tierRow}
              onPress={() => {
                setTier(opt.id);
                setManualValue('');
              }}
              activeOpacity={0.85}
            >
              <View style={addProductStyles.tierTextCol}>
                <View style={addProductStyles.tierHeaderRow}>
                  <RNText style={addProductStyles.tierTitle}>{t(opt.labelKey)}</RNText>
                  <RNText style={addProductStyles.tierRange}>{t(opt.rangeKey)}</RNText>
                </View>
                <RNText style={addProductStyles.tierHint}>{t(opt.hintKey)}</RNText>
              </View>
              <View style={[addProductStyles.tierRadio, selected && addProductStyles.tierRadioOn]} />
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={addProductStyles.field}>
        <RNText style={addProductStyles.manualWeightLabel}>{t('addProduct.manualWeight')}</RNText>
        <View style={addProductStyles.manualWeightRow}>
          <TextInput
            style={addProductStyles.manualWeightInput}
            value={manualValue}
            onChangeText={setManualValue}
            placeholder={manualPlaceholder}
            placeholderTextColor="#D9D9D9"
            keyboardType="decimal-pad"
            editable={tier != null}
          />
          <RNText style={addProductStyles.manualWeightUnit}>{manualUnit}</RNText>
        </View>
        {tier ? (
          <RNText style={addProductStyles.manualWeightHelp}>
            {t('addProduct.manualWeightLimit', { max: manualMax, unit: manualUnit })}
          </RNText>
        ) : null}
      </View>
    </StreamBottomSheet>
  );
};
