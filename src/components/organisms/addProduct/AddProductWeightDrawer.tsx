import React, { useEffect, useState } from 'react';
import { View, Text as RNText, TextInput, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet } from '../stream/StreamBottomSheet';
import {
  PRODUCT_WEIGHT_PRESETS,
  type ProductWeightPresetId,
} from '../../../constants/productWeightPresets';
import { addProductDrawerProps, addProductStyles } from './addProductStyles';
import { StartLivePrimaryButton } from '../startLive/StartLivePrimitives';

export interface AddProductWeightDrawerProps {
  visible: boolean;
  initialPresetId?: ProductWeightPresetId | null;
  initialManualKg?: string;
  onClose: () => void;
  onConfirm: (weightKg: number) => void;
}

/** Peso granular 250 g – 1 kg + manual (service_delivery usa kg) */
export const AddProductWeightDrawer: React.FC<AddProductWeightDrawerProps> = ({
  visible,
  initialPresetId,
  initialManualKg,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [presetId, setPresetId] = useState<ProductWeightPresetId | null>(initialPresetId ?? null);
  const [manualKg, setManualKg] = useState(initialManualKg ?? '');

  useEffect(() => {
    if (visible) {
      setPresetId(initialPresetId ?? null);
      setManualKg(initialManualKg ?? '');
    }
  }, [visible, initialPresetId, initialManualKg]);

  const handleConfirm = () => {
    if (presetId) {
      const preset = PRODUCT_WEIGHT_PRESETS.find((p) => p.id === presetId);
      if (preset) {
        onConfirm(preset.kg);
        return;
      }
    }
    const parsed = parseFloat(manualKg.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed > 0) {
      onConfirm(parsed);
    }
  };

  const parsedManual = parseFloat(manualKg.replace(',', '.'));
  const canConfirm =
    presetId != null || (Number.isFinite(parsedManual) && parsedManual > 0 && parsedManual <= 1);

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('addProduct.weightTitle')}
      onClose={onClose}
      dismissOnBackdropPress={false}
      {...addProductDrawerProps}
      contentContainerStyle={addProductStyles.drawerBody}
      footer={
        <StartLivePrimaryButton
          label={t('addProduct.confirm')}
          onPress={handleConfirm}
          disabled={!canConfirm}
        />
      }
    >
      <RNText style={addProductStyles.drawerHint}>{t('addProduct.weightHint')}</RNText>

      {PRODUCT_WEIGHT_PRESETS.map((preset) => {
        const selected = presetId === preset.id;
        return (
          <TouchableOpacity
            key={preset.id}
            style={addProductStyles.weightPresetRow}
            onPress={() => {
              setPresetId(preset.id);
              setManualKg('');
            }}
            activeOpacity={0.85}
          >
            <RNText style={addProductStyles.weightPresetLabel}>{t(preset.labelKey)}</RNText>
            <View style={[addProductStyles.tierRadio, selected && addProductStyles.tierRadioOn]} />
          </TouchableOpacity>
        );
      })}

      <View style={addProductStyles.field}>
        <RNText style={addProductStyles.manualWeightLabel}>{t('addProduct.manualWeight')}</RNText>
        <View style={addProductStyles.manualWeightRow}>
          <TextInput
            style={addProductStyles.manualWeightInput}
            value={manualKg}
            onChangeText={(v) => {
              setManualKg(v);
              setPresetId(null);
            }}
            placeholder={t('addProduct.manualWeightPlaceholder')}
            placeholderTextColor="#D9D9D9"
            keyboardType="decimal-pad"
          />
          <RNText style={addProductStyles.manualWeightUnit}>Kg</RNText>
        </View>
      </View>
    </StreamBottomSheet>
  );
};
