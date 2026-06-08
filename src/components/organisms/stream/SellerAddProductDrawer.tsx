/**
 * Drawer vidriado para agregar producto al stock del vivo — Figma 636-31420.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text as RNText,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ImageUp, Plus, X } from 'lucide-react-native';
import { StreamBottomSheet, streamSheetStyles } from './StreamBottomSheet';
import { AddProductPhotoSourceDrawer } from '../addProduct/AddProductPhotoSourceDrawer';
import { useSellerLiveAddProduct } from '../../../hooks/useSellerLiveAddProduct';
import { MAX_PRODUCT_PHOTOS } from '../../../hooks/useAddProductForm';
import { FONT_FAMILY } from '../../../theme/typography';
import type { SaleFormatId } from '../../../constants/productWeightPresets';

const GLASS_PANEL = {
  backgroundColor: 'rgba(2, 5, 15, 0.4)',
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
} as const;

export interface SellerAddProductDrawerProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  categoryUuid: string | null;
  saleFormat?: SaleFormatId;
  onSaved?: () => void;
}

export const SellerAddProductDrawer: React.FC<SellerAddProductDrawerProps> = ({
  visible,
  onClose,
  roomId,
  categoryUuid,
  saleFormat = 'individual',
  onSaved,
}) => {
  const { t } = useTranslation();
  const [mediaPickerActive, setMediaPickerActive] = useState(false);

  const handleBeforeMediaPicker = useCallback(() => {
    setMediaPickerActive(true);
  }, []);

  const handleAfterMediaPicker = useCallback(() => {
    setMediaPickerActive(false);
  }, []);

  const form = useSellerLiveAddProduct({
    roomId,
    categoryUuid,
    saleFormat,
    onAfterMediaPicker: handleAfterMediaPicker,
    onSuccess: () => {
      onSaved?.();
      onClose();
    },
  });

  const { reset } = form;

  useEffect(() => {
    if (!visible) {
      reset();
    }
  }, [visible, reset]);

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <>
      <StreamBottomSheet
        visible={visible && !mediaPickerActive}
        title={t('stream.addProductDrawerTitle')}
        onClose={handleClose}
        panelStyle={styles.panel}
        contentContainerStyle={styles.content}
        cancelLabel={t('addProduct.cancel')}
        onCancelPress={handleClose}
        footer={
          <TouchableOpacity
            style={[streamSheetStyles.primaryBtn, form.submitting && styles.btnDisabled]}
            onPress={form.submit}
            disabled={form.submitting}
            activeOpacity={0.85}
          >
            {form.submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <RNText style={streamSheetStyles.primaryBtnText}>{t('addProduct.save')}</RNText>
            )}
          </TouchableOpacity>
        }
      >
        <View style={styles.field}>
          <RNText style={styles.fieldLabel}>{t('addProduct.fieldTitle')}</RNText>
          <TextInput
            style={styles.input}
            value={form.title}
            onChangeText={form.setTitle}
            placeholder={t('addProduct.fieldTitlePlaceholder')}
            placeholderTextColor="rgba(255,255,255,0.45)"
          />
        </View>

        <View style={styles.field}>
          <RNText style={styles.fieldLabel}>{t('addProduct.fieldDescription')}</RNText>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={form.description}
            onChangeText={form.setDescription}
            placeholder={t('addProduct.fieldDescriptionPlaceholder')}
            placeholderTextColor="rgba(255,255,255,0.45)"
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.field}>
          <RNText style={styles.fieldLabel}>{t('addProduct.fieldMinOffer')}</RNText>
          <View style={styles.priceRow}>
            <RNText style={styles.pricePrefix}>$</RNText>
            <TextInput
              style={[styles.input, styles.priceInput]}
              value={form.minOfferPrice}
              onChangeText={form.setMinOfferPrice}
              placeholder={t('addProduct.fieldMinOfferPlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.45)"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.field}>
          <RNText style={styles.fieldLabel}>{t('stream.addProductPhotosLabel')}</RNText>
          {form.photos.length === 0 ? (
            <TouchableOpacity style={styles.photoBox} onPress={form.pickPhotos} activeOpacity={0.85}>
              <ImageUp size={24} color="rgba(255,255,255,0.7)" />
              <RNText style={styles.photoBoxHint}>{t('addProduct.photosLabel')}</RNText>
            </TouchableOpacity>
          ) : (
            <View style={styles.photoRow}>
              {form.photos.map((p) => (
                <View key={p.uri} style={styles.photoThumb}>
                  <Image source={{ uri: p.uri }} style={styles.photoThumbImage} />
                  <TouchableOpacity
                    style={styles.photoRemoveBtn}
                    onPress={() => form.removePhoto(p.uri)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={t('addProduct.removePhoto')}
                  >
                    <X size={14} color="#FFFFFF" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              ))}
              {form.canAddMorePhotos ? (
                <TouchableOpacity
                  style={styles.photoAddTile}
                  onPress={form.pickPhotos}
                  activeOpacity={0.85}
                >
                  <Plus size={20} color="#685CF0" />
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>
      </StreamBottomSheet>

      {visible && !mediaPickerActive ? (
        <View style={styles.subDrawerHost} pointerEvents="box-none">
          <AddProductPhotoSourceDrawer
            visible={form.activeDrawer === 'photos'}
            presentation="overlay"
            showCameraOption={false}
            photoCount={form.photos.length}
            maxPhotos={MAX_PRODUCT_PHOTOS}
            onClose={() => form.setActiveDrawer('none')}
            onBeforePicker={handleBeforeMediaPicker}
            onAfterPicker={handleAfterMediaPicker}
            onTakePhoto={form.openCamera}
            onChooseGallery={form.openGallery}
          />
        </View>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  panel: {
    ...GLASS_PANEL,
    maxHeight: '88%',
  },
  content: {
    gap: 16,
    width: '100%',
    paddingBottom: 8,
  },
  subDrawerHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 300,
    elevation: 300,
  },
  field: {
    gap: 8,
    width: '100%',
  },
  fieldLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 18,
    color: '#FFFFFF',
    letterSpacing: 0.06,
    includeFontPadding: false,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(221, 221, 221, 0.6)',
    borderRadius: 1000,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  inputMultiline: {
    borderRadius: 16,
    minHeight: 88,
    paddingTop: 14,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pricePrefix: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  priceInput: {
    flex: 1,
  },
  photoBox: {
    borderWidth: 1,
    borderColor: 'rgba(221, 221, 221, 0.45)',
    borderRadius: 12,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  photoBoxHint: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photoThumbImage: {
    width: '100%',
    height: '100%',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddTile: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(104, 92, 240, 0.6)',
    backgroundColor: 'rgba(104, 92, 240, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.65,
  },
});
