import React, { useCallback } from 'react';
import { Platform, StyleSheet, View, Text as RNText, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Camera, ChevronRight, Images } from 'lucide-react-native';
import { StreamBottomSheet } from '../stream/StreamBottomSheet';
import { addProductDrawerProps, addProductStyles } from './addProductStyles';
import { deferMediaPicker } from '../../../utils/deferMediaPicker';
import { themeColors } from '../../../theme/colors';
import { LAYERS } from '../../../theme/layers';

export interface AddProductPhotoSourceDrawerProps {
  visible: boolean;
  photoCount: number;
  maxPhotos: number;
  onClose: () => void;
  /** Solo abre el picker; el drawer ya cerró overlays y aplicó defer en iOS. */
  onTakePhoto: () => void;
  onChooseGallery: () => void;
  /**
   * `overlay`: inline sobre host absoluto (streams / PreLive).
   * `modal`: Modal RN vía StreamBottomSheet (pantallas normales).
   */
  presentation?: 'modal' | 'overlay';
  showCameraOption?: boolean;
  /** Oculta modales padre antes del picker (p. ej. PreLiveSetupOverlay). */
  onBeforePicker?: () => void;
  onAfterPicker?: () => void;
}

/** Origen de fotos — cierra sheets/modales y difiere el picker en iOS. */
export const AddProductPhotoSourceDrawer: React.FC<AddProductPhotoSourceDrawerProps> = ({
  visible,
  photoCount,
  maxPhotos,
  onClose,
  onTakePhoto,
  onChooseGallery,
  presentation = Platform.OS === 'ios' ? 'overlay' : 'modal',
  showCameraOption = true,
  onBeforePicker,
  onAfterPicker,
}) => {
  const { t } = useTranslation();
  const remaining = maxPhotos - photoCount;
  const atLimit = remaining <= 0;
  const useOverlay = presentation === 'overlay';

  const runPickerAction = useCallback(
    (action: () => void) => {
      if (atLimit) return;
      onClose();
      onBeforePicker?.();
      deferMediaPicker(() => {
        try {
          action();
        } catch {
          onAfterPicker?.();
        }
      });
    },
    [atLimit, onClose, onBeforePicker, onAfterPicker],
  );

  const options = [
    {
      id: 'camera' as const,
      labelKey: 'addProduct.takePhoto' as const,
      hintKey: 'addProduct.takePhotoHint' as const,
      icon: Camera,
      onPress: () => runPickerAction(onTakePhoto),
    },
    {
      id: 'gallery' as const,
      labelKey: 'addProduct.chooseFromGallery' as const,
      hintKey: 'addProduct.chooseFromGalleryHint' as const,
      icon: Images,
      onPress: () => runPickerAction(onChooseGallery),
    },
  ];

  const sheet = (
    <StreamBottomSheet
      visible={visible}
      title={t('addProduct.photoPickerTitle')}
      onClose={onClose}
      nativeModal={!useOverlay}
      {...addProductDrawerProps}
      contentContainerStyle={addProductStyles.photoSourceBody}
      scrollEnabled={false}
    >
      <RNText style={addProductStyles.photoSourceIntro}>
        {atLimit
          ? t('addProduct.maxPhotos', { count: maxPhotos })
          : t('addProduct.photoPickerSubtitle', { remaining, max: maxPhotos })}
      </RNText>

      {!showCameraOption ? (
        <RNText style={addProductStyles.photoSourceIntro}>{t('stream.addProductGalleryOnlyHint')}</RNText>
      ) : null}

      <View style={addProductStyles.photoSourceList}>
        {options.filter((opt) => showCameraOption || opt.id !== 'camera').map((opt) => {
          const Icon = opt.icon;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[addProductStyles.photoSourceRow, atLimit && addProductStyles.photoSourceRowDisabled]}
              onPress={opt.onPress}
              disabled={atLimit}
              activeOpacity={0.85}
            >
              <View style={addProductStyles.photoSourceIconWrap}>
                <Icon size={20} color={themeColors.primary} strokeWidth={2.3} />
              </View>
              <View style={addProductStyles.photoSourceTextCol}>
                <RNText style={addProductStyles.photoSourceTitle}>{t(opt.labelKey)}</RNText>
                <RNText style={addProductStyles.photoSourceHint}>{t(opt.hintKey)}</RNText>
              </View>
              <ChevronRight size={20} color={themeColors.glass.textMuted} strokeWidth={2.2} />
            </TouchableOpacity>
          );
        })}
      </View>
    </StreamBottomSheet>
  );

  if (useOverlay) {
    if (!visible) return null;
    /**
     * `box-none`: fuera de un Modal el sheet se va al portal raíz y este host queda vacío;
     * sin esto sería una capa transparente a pantalla completa comiéndose los toques.
     */
    return (
      <View style={styles.overlayHost} pointerEvents="box-none">
        {sheet}
      </View>
    );
  }

  return sheet;
};

const styles = StyleSheet.create({
  overlayHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: LAYERS.overlay,
    elevation: LAYERS.overlay,
  },
});
