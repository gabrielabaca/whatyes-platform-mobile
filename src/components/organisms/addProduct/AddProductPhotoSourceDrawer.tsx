import React from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text as RNText,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Camera, ChevronRight, Images } from 'lucide-react-native';
import { StreamBottomSheet } from '../stream/StreamBottomSheet';
import { addProductStyles } from './addProductStyles';
import { startLivePanelStyle } from '../startLive/startLiveStyles';

export interface AddProductPhotoSourceDrawerProps {
  visible: boolean;
  photoCount: number;
  maxPhotos: number;
  onClose: () => void;
  onTakePhoto: () => void;
  onChooseGallery: () => void;
}

/** Origen de fotos — mismo patrón que condición / peso (StreamBottomSheet). */
export const AddProductPhotoSourceDrawer: React.FC<AddProductPhotoSourceDrawerProps> = ({
  visible,
  photoCount,
  maxPhotos,
  onClose,
  onTakePhoto,
  onChooseGallery,
}) => {
  const { t } = useTranslation();
  const remaining = maxPhotos - photoCount;
  const atLimit = remaining <= 0;
  const panelStyle: StyleProp<ViewStyle> = [startLivePanelStyle, { paddingTop: 28 }];

  const options = [
    {
      id: 'camera' as const,
      labelKey: 'addProduct.takePhoto' as const,
      hintKey: 'addProduct.takePhotoHint' as const,
      icon: Camera,
      onPress: onTakePhoto,
    },
    {
      id: 'gallery' as const,
      labelKey: 'addProduct.chooseFromGallery' as const,
      hintKey: 'addProduct.chooseFromGalleryHint' as const,
      icon: Images,
      onPress: onChooseGallery,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <StreamBottomSheet
          visible={visible}
          title={t('addProduct.photoPickerTitle')}
          onClose={onClose}
          bottomPanel
          panelStyle={panelStyle}
          contentContainerStyle={addProductStyles.photoSourceBody}
          scrollEnabled={false}
        >
          <RNText style={addProductStyles.photoSourceIntro}>
            {atLimit
              ? t('addProduct.maxPhotos', { count: maxPhotos })
              : t('addProduct.photoPickerSubtitle', { remaining, max: maxPhotos })}
          </RNText>

          <View style={addProductStyles.photoSourceList}>
            {options.map((opt) => {
              const Icon = opt.icon;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[addProductStyles.photoSourceRow, atLimit && addProductStyles.photoSourceRowDisabled]}
                  onPress={() => !atLimit && opt.onPress()}
                  disabled={atLimit}
                  activeOpacity={0.85}
                >
                  <View style={addProductStyles.photoSourceIconWrap}>
                    <Icon size={20} color="#685CF0" strokeWidth={2.3} />
                  </View>
                  <View style={addProductStyles.photoSourceTextCol}>
                    <RNText style={addProductStyles.photoSourceTitle}>{t(opt.labelKey)}</RNText>
                    <RNText style={addProductStyles.photoSourceHint}>{t(opt.hintKey)}</RNText>
                  </View>
                  <ChevronRight size={20} color="#D9D9D9" strokeWidth={2.2} />
                </TouchableOpacity>
              );
            })}
          </View>
        </StreamBottomSheet>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
