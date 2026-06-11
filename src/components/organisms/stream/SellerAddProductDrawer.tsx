/**
 * Form in-live "Carga un producto" — pantalla completa clara (Figma 698:11652 / 698:11849 / 698:12046).
 * Campos por modalidad (lógicos):
 *  - Comprar Ahora: Precio
 *  - Subasta Rápida: Mínimo de Oferta + Tiempo límite de subasta
 *  - Sorteo: modo de participación (seguidores / todos / compradores)
 *  Comunes: Fotos, Categoría, Título, Descripción, Cantidad, Peso, SKU.
 */
import React, { useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronLeft, ImageUp, Minus, Plus, X } from 'lucide-react-native';
import { useInterestCategories } from '../../../hooks/useInterestCategories';
import { useSellerLiveAddProduct } from '../../../hooks/useSellerLiveAddProduct';
import { MAX_PRODUCT_PHOTOS } from '../../../hooks/useAddProductForm';
import { SaleModeTabs } from '../../molecules/stream/SaleModeTabs';
import { AddProductSelectField } from '../addProduct/AddProductSelectField';
import { AddProductPackageTierDrawer } from '../addProduct/AddProductPackageTierDrawer';
import { AddProductPhotoSourceDrawer } from '../addProduct/AddProductPhotoSourceDrawer';
import { StartLiveCategoriesDrawer } from '../startLive/StartLiveCategoriesDrawer';
import { addProductStyles, ADD_PRODUCT_COLORS } from '../addProduct/addProductStyles';
import { FONT_FAMILY } from '../../../theme/typography';
import type { LiveSaleMode, ProductListScope } from '../../../api/types';
import type { SaleFormatId } from '../../../constants/productWeightPresets';

const RAFFLE_MODES = [
  { id: 'followers_only', titleKey: 'stream.raffleFollowersOnly', descKey: 'stream.raffleFollowersOnlyDesc' },
  { id: 'everyone', titleKey: 'stream.raffleEveryone', descKey: 'stream.raffleEveryoneDesc' },
  { id: 'buyers', titleKey: 'stream.raffleBuyers', descKey: 'stream.raffleBuyersDesc' },
] as const;

export interface SellerAddProductDrawerProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  categoryUuid: string | null;
  saleFormat?: SaleFormatId;
  scope: ProductListScope;
  defaultSaleMode?: LiveSaleMode;
  onSaved?: () => void;
}

export const SellerAddProductDrawer: React.FC<SellerAddProductDrawerProps> = ({
  visible,
  onClose,
  roomId,
  categoryUuid,
  saleFormat = 'individual',
  scope,
  defaultSaleMode = 'buy_now',
  onSaved,
}) => {
  const { t } = useTranslation();
  const { categories, loadOnce } = useInterestCategories();

  useEffect(() => {
    if (visible) loadOnce();
  }, [visible, loadOnce]);

  const form = useSellerLiveAddProduct({
    roomId,
    categoryUuid,
    categories,
    saleFormat,
    scope,
    defaultSaleMode,
    onSuccess: () => {
      onSaved?.();
      onClose();
    },
  });

  const { reset, setLiveSaleMode } = form;

  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  useEffect(() => {
    if (visible) setLiveSaleMode(defaultSaleMode);
  }, [visible, defaultSaleMode, setLiveSaleMode]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  if (!visible) return null;

  const saleMode = form.liveSaleMode;

  return (
    <View style={styles.host}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} hitSlop={12} accessibilityRole="button">
            <ChevronLeft size={24} color={ADD_PRODUCT_COLORS.title} />
          </TouchableOpacity>
          <RNText style={styles.headerTitle}>{t('stream.addProductDrawerTitle')}</RNText>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[addProductStyles.scrollContent, styles.scrollPad]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={addProductStyles.tipsBanner} activeOpacity={0.85}>
            <View style={addProductStyles.tipsTextCol}>
              <RNText style={addProductStyles.tipsTitle}>{t('addProduct.tipsTitle')}</RNText>
              <RNText style={addProductStyles.tipsBody}>{t('addProduct.tipsBody')}</RNText>
            </View>
            <View style={addProductStyles.tipsArrow}>
              <ArrowRight size={20} color={ADD_PRODUCT_COLORS.primary} />
            </View>
          </TouchableOpacity>

          <RNText style={addProductStyles.sectionTitle}>{t('addProduct.screenTitle')}</RNText>

          {form.photos.length === 0 ? (
            <TouchableOpacity style={addProductStyles.photoBox} onPress={form.pickPhotos} activeOpacity={0.85}>
              <RNText style={addProductStyles.photoBoxLabel}>{t('addProduct.photosLabel')}</RNText>
              <ImageUp size={24} color={ADD_PRODUCT_COLORS.muted} />
            </TouchableOpacity>
          ) : (
            <View style={addProductStyles.photoRow}>
              {form.photos.map((p) => (
                <View key={p.uri} style={addProductStyles.photoThumb}>
                  <Image source={{ uri: p.uri }} style={addProductStyles.photoThumbImage} />
                  <TouchableOpacity
                    style={addProductStyles.photoRemoveBtn}
                    onPress={() => form.removePhoto(p.uri)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={14} color="#FFFFFF" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              ))}
              {form.canAddMorePhotos ? (
                <TouchableOpacity style={addProductStyles.photoAddTile} onPress={form.pickPhotos} activeOpacity={0.85}>
                  <Plus size={20} color={ADD_PRODUCT_COLORS.primary} />
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          <View style={addProductStyles.fields}>
            <AddProductSelectField
              label={t('addProduct.fieldCategory')}
              value={form.categoryLabel}
              placeholder={t('addProduct.fieldCategoryPlaceholder')}
              onPress={() => form.setActiveDrawer('category')}
            />

            <View style={addProductStyles.field}>
              <RNText style={addProductStyles.fieldLabel}>{t('addProduct.fieldTitle')}</RNText>
              <TextInput
                style={addProductStyles.pillInput}
                value={form.title}
                onChangeText={form.setTitle}
                placeholder={t('addProduct.fieldTitlePlaceholder')}
                placeholderTextColor={ADD_PRODUCT_COLORS.placeholder}
              />
            </View>

            <View style={addProductStyles.field}>
              <RNText style={addProductStyles.fieldLabel}>{t('addProduct.fieldDescription')}</RNText>
              <TextInput
                style={[addProductStyles.pillInput, addProductStyles.pillInputMultiline]}
                value={form.description}
                onChangeText={form.setDescription}
                placeholder={t('addProduct.fieldDescriptionPlaceholder')}
                placeholderTextColor={ADD_PRODUCT_COLORS.placeholder}
                multiline
              />
            </View>

            <View style={addProductStyles.field}>
              <RNText style={addProductStyles.fieldLabel}>{t('addProduct.fieldQuantity')}</RNText>
              <View style={styles.stepperRow}>
                <TouchableOpacity style={styles.stepperBtn} onPress={form.decrementQuantity}>
                  <Minus size={20} color={ADD_PRODUCT_COLORS.text} />
                </TouchableOpacity>
                <View style={styles.stepperValueWrap}>
                  <RNText style={styles.stepperValue}>{form.quantity}</RNText>
                </View>
                <TouchableOpacity style={styles.stepperBtn} onPress={form.incrementQuantity}>
                  <Plus size={20} color={ADD_PRODUCT_COLORS.text} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <RNText style={addProductStyles.sectionTitle}>{t('addProduct.fieldPrice')}</RNText>
          <SaleModeTabs value={saleMode} onChange={form.setLiveSaleMode} />

          <View style={addProductStyles.fields}>
            {saleMode === 'buy_now' ? (
              <View style={addProductStyles.field}>
                <RNText style={addProductStyles.fieldLabel}>{t('addProduct.fieldPrice')}</RNText>
                <View style={addProductStyles.priceInputWrap}>
                  <RNText style={addProductStyles.pricePrefix}>$</RNText>
                  <TextInput
                    style={addProductStyles.priceInput}
                    value={form.price}
                    onChangeText={form.setPrice}
                    placeholder={t('addProduct.fieldMinOfferPlaceholder')}
                    placeholderTextColor={ADD_PRODUCT_COLORS.placeholder}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            ) : null}

            {saleMode === 'auction' ? (
              <>
                <View style={addProductStyles.field}>
                  <RNText style={addProductStyles.fieldLabel}>{t('stream.addProductMinBid')}</RNText>
                  <View style={addProductStyles.priceInputWrap}>
                    <RNText style={addProductStyles.pricePrefix}>$</RNText>
                    <TextInput
                      style={addProductStyles.priceInput}
                      value={form.minBidPrice}
                      onChangeText={form.setMinBidPrice}
                      placeholder={t('addProduct.fieldMinOfferPlaceholder')}
                      placeholderTextColor={ADD_PRODUCT_COLORS.placeholder}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
                <View style={addProductStyles.field}>
                  <RNText style={addProductStyles.fieldLabel}>{t('stream.addProductAuctionTime')}</RNText>
                  <View style={addProductStyles.priceInputWrap}>
                    <TextInput
                      style={addProductStyles.priceInput}
                      value={form.auctionDuration}
                      onChangeText={form.setAuctionDuration}
                      keyboardType="number-pad"
                      placeholder="60"
                      placeholderTextColor={ADD_PRODUCT_COLORS.placeholder}
                    />
                    <RNText style={styles.durationSuffix}>{t('stream.addProductSeconds')}</RNText>
                  </View>
                </View>
              </>
            ) : null}

            {saleMode === 'raffle' ? (
              <View style={styles.raffleGroup}>
                {RAFFLE_MODES.map((mode) => {
                  const active = form.raffleMode === mode.id;
                  return (
                    <TouchableOpacity
                      key={mode.id}
                      style={styles.raffleRow}
                      onPress={() => form.setRaffleMode(mode.id)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.raffleTextCol}>
                        <RNText style={styles.raffleTitle}>{t(mode.titleKey)}</RNText>
                        <RNText style={styles.raffleDesc}>{t(mode.descKey)}</RNText>
                      </View>
                      <View style={[styles.raffleRadio, active && styles.raffleRadioOn]} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            <AddProductSelectField
              label={t('addProduct.fieldWeight')}
              value={form.weightLabel}
              placeholder={t('addProduct.fieldWeightPlaceholder')}
              onPress={() => form.setActiveDrawer('weight')}
            />

            <View style={addProductStyles.field}>
              <RNText style={addProductStyles.fieldLabel}>{t('addProduct.fieldSku')}</RNText>
              <TextInput
                style={addProductStyles.pillInput}
                value={form.sku}
                onChangeText={form.setSku}
                placeholder={t('addProduct.fieldSkuPlaceholder')}
                placeholderTextColor={ADD_PRODUCT_COLORS.placeholder}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={addProductStyles.actions}>
            <TouchableOpacity
              style={[addProductStyles.primaryBtn, form.submitting && addProductStyles.primaryBtnDisabled]}
              onPress={form.submitPublish}
              disabled={form.submitting}
              activeOpacity={0.85}
            >
              {form.submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <RNText style={addProductStyles.primaryBtnText}>{t('stream.publish')}</RNText>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={addProductStyles.cancelBtn}
              onPress={form.submitDraft}
              disabled={form.submitting}
              activeOpacity={0.85}
            >
              <RNText style={addProductStyles.cancelBtnText}>{t('stream.saveDraft')}</RNText>
            </TouchableOpacity>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <View style={styles.drawerHost} pointerEvents="box-none">
        <StartLiveCategoriesDrawer
          visible={form.activeDrawer === 'category'}
          selectionMode="single"
          titleKey="addProduct.categoryTitle"
          subtitleKey="addProduct.categorySubtitle"
          initialSelected={form.categoryUuid ? [form.categoryUuid] : []}
          onClose={() => form.setActiveDrawer('none')}
          onContinue={(uuids) => {
            if (uuids[0]) form.setCategoryUuid(uuids[0]);
            form.setActiveDrawer('none');
          }}
        />
        <AddProductPackageTierDrawer
          visible={form.activeDrawer === 'weight'}
          initialTier={form.packageTier}
          initialManualKg={String(form.weightKg)}
          onClose={() => form.setActiveDrawer('none')}
          onConfirm={(tier, kg) => {
            form.setPackageTier(tier, kg);
            form.setActiveDrawer('none');
          }}
        />
        <AddProductPhotoSourceDrawer
          visible={form.activeDrawer === 'photos'}
          presentation="overlay"
          showCameraOption={false}
          photoCount={form.photos.length}
          maxPhotos={MAX_PRODUCT_PHOTOS}
          onClose={() => form.setActiveDrawer('none')}
          onTakePhoto={form.openCamera}
          onChooseGallery={form.openGallery}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 250,
    elevation: 250,
  },
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: ADD_PRODUCT_COLORS.title,
  },
  headerSpacer: {
    width: 24,
  },
  scrollPad: {
    paddingBottom: 40,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperBtn: {
    width: 52,
    height: 52,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: ADD_PRODUCT_COLORS.border,
    backgroundColor: '#F4F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueWrap: {
    flex: 1,
    minHeight: 52,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: ADD_PRODUCT_COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    color: ADD_PRODUCT_COLORS.text,
  },
  durationSuffix: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 20,
    color: ADD_PRODUCT_COLORS.text,
    marginLeft: 8,
  },
  raffleGroup: {
    gap: 24,
  },
  raffleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  raffleTextCol: {
    flex: 1,
    gap: 4,
  },
  raffleTitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: ADD_PRODUCT_COLORS.text,
  },
  raffleDesc: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: ADD_PRODUCT_COLORS.muted,
  },
  raffleRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ADD_PRODUCT_COLORS.borderAccent,
    backgroundColor: 'rgba(104, 92, 240, 0.1)',
  },
  raffleRadioOn: {
    borderWidth: 2,
    borderColor: ADD_PRODUCT_COLORS.primary,
    backgroundColor: ADD_PRODUCT_COLORS.primary,
  },
  drawerHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 300,
    elevation: 300,
  },
});
