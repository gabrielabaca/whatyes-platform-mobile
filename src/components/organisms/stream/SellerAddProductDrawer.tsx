/**
 * Form in-live "Carga un producto" — modal glass full-screen (Figma 698:11652 / 698:11849 / 698:12046).
 * Campos por modalidad (lógicos):
 *  - Comprar Ahora: Precio
 *  - Subasta Rápida: Mínimo de Oferta + Tiempo límite de subasta
 *  - Sorteo: modo de participación (seguidores / todos / compradores)
 *  Comunes: Fotos, Categoría, Título, Descripción, Cantidad, Peso, SKU.
 *
 * Presentación: `GlassFullScreenModal` (misma base que los modales de cuenta/perfil), header
 * canónico título + X y CTAs fijadas al pie. El teclado lo resuelve el KeyboardAvoidingView
 * de la base (padding iOS / height Android), que además levanta el footer: por eso acá NO se
 * declara otro KAV, sumaría una segunda compensación.
 *
 * Sub-drawers: cada uno monta su propio Modal RN por encima de este (categorías ya lo hacía;
 * peso y origen de fotos lo piden explícito). Así quedan anclados al borde real de la pantalla
 * y manejan el teclado por su cuenta, sin heredar el KAV de este modal — no hace falta un host
 * absoluto con zIndex.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { AppTextInput } from '../../atoms/AppTextInput';
import { KeyboardDismissScrollView } from '../../atoms/KeyboardDismissScrollView';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronRight, ImageUp, Minus, Plus, X } from 'lucide-react-native';
import { useInterestCategories } from '../../../hooks/useInterestCategories';
import {
  AUCTION_DURATION_OPTIONS,
  useSellerLiveAddProduct,
} from '../../../hooks/useSellerLiveAddProduct';
import { MAX_PRODUCT_PHOTOS } from '../../../hooks/useAddProductForm';
import { SaleModeTabs } from '../../molecules/stream/SaleModeTabs';
import { AddProductPackageTierDrawer } from '../addProduct/AddProductPackageTierDrawer';
import { AddProductPhotoSourceDrawer } from '../addProduct/AddProductPhotoSourceDrawer';
import { StartLiveCategoriesDrawer } from '../startLive/StartLiveCategoriesDrawer';
import {
  GlassFullScreenModal,
  type GlassFullScreenModalHandle,
} from '../profile/GlassFullScreenModal';
import { GlassModalHeader } from '../profile/GlassModalHeader';
import { streamSheetStyles } from './StreamBottomSheet';
import { addProductGlassStyles, addProductStyles } from '../addProduct/addProductStyles';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import type { LiveSaleMode, ProductListScope } from '../../../api/types';
import type { SaleFormatId } from '../../../constants/productWeightPresets';
import { appAlert } from '../../../alerts';

const RAFFLE_MODES = [
  { id: 'followers_only', titleKey: 'stream.raffleFollowersOnly', descKey: 'stream.raffleFollowersOnlyDesc' },
  { id: 'everyone', titleKey: 'stream.raffleEveryone', descKey: 'stream.raffleEveryoneDesc' },
  { id: 'buyers', titleKey: 'stream.raffleBuyers', descKey: 'stream.raffleBuyersDesc' },
] as const;

/** Marca de campo obligatorio (tarea 23). Sufijo visual, no va a la i18n compartida. */
const req = (label: string) => `${label} *`;

/** Select glass: la variante clara (`AddProductSelectField`) la usa la pantalla de alta. */
const GlassSelectField: React.FC<{
  label: string;
  value?: string | null;
  placeholder: string;
  onPress: () => void;
}> = ({ label, value, placeholder, onPress }) => (
  <View style={addProductStyles.field}>
    <RNText style={[addProductStyles.fieldLabel, addProductGlassStyles.fieldLabel]}>{label}</RNText>
    <TouchableOpacity
      style={[addProductStyles.pillSelect, addProductGlassStyles.surface]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
    >
      <RNText
        style={[
          addProductStyles.pillSelectText,
          value ? addProductStyles.pillSelectTextFilled : null,
          value ? addProductGlassStyles.inputText : addProductGlassStyles.selectPlaceholder,
        ]}
        numberOfLines={1}
      >
        {value || placeholder}
      </RNText>
      <ChevronRight
        size={20}
        color={themeColors.glass.textMuted}
        style={{ transform: [{ rotate: '90deg' }] }}
      />
    </TouchableOpacity>
  </View>
);

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
  const modalRef = useRef<GlassFullScreenModalHandle>(null);

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

  /** Solo lo que el vendedor cargó a mano: categoría/peso/modalidad vienen del vivo. */
  const hasChanges =
    form.title.trim().length > 0 ||
    form.description.trim().length > 0 ||
    form.price.trim().length > 0 ||
    form.minBidPrice.trim().length > 0 ||
    form.sku.trim().length > 0 ||
    form.photos.length > 0 ||
    form.quantity !== 1;

  /** Cerrar con datos cargados pide confirmación: antes se descartaba el form en silencio. */
  const handleRequestClose = useCallback(() => {
    if (form.submitting) return;
    if (!hasChanges) {
      modalRef.current?.dismiss();
      return;
    }
    appAlert(
      t('stream.addProductDiscardTitle'),
      t('stream.addProductDiscardBody'),
      [
        { text: t('stream.addProductDiscardKeep'), style: 'cancel' },
        {
          text: t('stream.addProductDiscardConfirm'),
          style: 'destructive',
          onPress: () => modalRef.current?.dismiss(),
        },
      ],
      { cancelable: true },
    );
  }, [form.submitting, hasChanges, t]);

  if (!visible) return null;

  const saleMode = form.liveSaleMode;

  return (
    <GlassFullScreenModal
      ref={modalRef}
      visible={visible}
      onClose={onClose}
      dismissOnBackdropPress={false}
      /** El botón atrás de Android pasa por la misma confirmación que la X. */
      onRequestClose={handleRequestClose}
      backdropAccessibilityLabel={t('common.close')}
      /** Scroll propio: los sub-drawers van fuera de él, sin sumar gaps al contenido. */
      scrollable={false}
      /** Tarea 22: con el teclado abierto las CTAs se desmontan en vez de montarse sobre él. */
      hideFooterOnKeyboard
      /**
       * Los sub-drawers van en el slot `overlay`, que es absoluto a la raíz del modal:
       * como children quedaban dentro del cuerpo y se anclaban arriba del footer en vez
       * de a la base de la pantalla.
       */
      overlay={
        <>
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
            nativeModal
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
            presentation="modal"
            showCameraOption={false}
            photoCount={form.photos.length}
            maxPhotos={MAX_PRODUCT_PHOTOS}
            onClose={() => form.setActiveDrawer('none')}
            onTakePhoto={form.openCamera}
            onChooseGallery={form.openGallery}
          />
        </>
      }
      header={
        <GlassModalHeader
          title={t('stream.addProductDrawerTitle')}
          onClose={handleRequestClose}
          closeDisabled={form.submitting}
        />
      }
      footer={
        <View style={addProductGlassStyles.footerActions}>
          <TouchableOpacity
            style={[streamSheetStyles.primaryBtn, form.submitting && addProductGlassStyles.disabled]}
            onPress={form.submitPublish}
            disabled={form.submitting}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            {form.submitting ? (
              <ActivityIndicator color={themeColors.glass.text} size="small" />
            ) : (
              <RNText style={streamSheetStyles.primaryBtnText}>{t('stream.publish')}</RNText>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[addProductGlassStyles.secondaryBtn, form.submitting && addProductGlassStyles.disabled]}
            onPress={form.submitDraft}
            disabled={form.submitting}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <RNText style={addProductGlassStyles.secondaryBtnText}>{t('stream.saveDraft')}</RNText>
          </TouchableOpacity>
        </View>
      }
    >
      <KeyboardDismissScrollView
        style={styles.scroll}
        contentContainerStyle={addProductGlassStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <TouchableOpacity
          style={[addProductStyles.tipsBanner, addProductGlassStyles.tipsBanner]}
          activeOpacity={0.85}
        >
          <View style={addProductStyles.tipsTextCol}>
            <RNText style={[addProductStyles.tipsTitle, addProductGlassStyles.tipsTitle]}>
              {t('addProduct.tipsTitle')}
            </RNText>
            <RNText style={[addProductStyles.tipsBody, addProductGlassStyles.tipsBody]}>
              {t('addProduct.tipsBody')}
            </RNText>
          </View>
          <View style={[addProductStyles.tipsArrow, addProductGlassStyles.tipsArrow]}>
            <ArrowRight size={20} color={themeColors.glass.text} />
          </View>
        </TouchableOpacity>

        <RNText style={[addProductStyles.sectionTitle, addProductGlassStyles.sectionTitle]}>
          {t('addProduct.screenTitle')}
        </RNText>

        {form.photos.length === 0 ? (
          <TouchableOpacity
            style={[addProductStyles.photoBox, addProductGlassStyles.photoBox]}
            onPress={form.pickPhotos}
            activeOpacity={0.85}
          >
            <RNText style={[addProductStyles.photoBoxLabel, addProductGlassStyles.photoBoxLabel]}>
              {req(t('addProduct.photosLabel'))}
            </RNText>
            <ImageUp size={24} color={themeColors.glass.textMuted} />
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
                  <X size={14} color={themeColors.glass.text} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ))}
            {form.canAddMorePhotos ? (
              <TouchableOpacity
                style={[addProductStyles.photoAddTile, addProductGlassStyles.photoAddTile]}
                onPress={form.pickPhotos}
                activeOpacity={0.85}
              >
                <Plus size={20} color={themeColors.glass.text} />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        <View style={addProductStyles.fields}>
          <GlassSelectField
            label={req(t('addProduct.fieldCategory'))}
            value={form.categoryLabel}
            placeholder={t('addProduct.fieldCategoryPlaceholder')}
            onPress={() => form.setActiveDrawer('category')}
          />

          <View style={addProductStyles.field}>
            <RNText style={[addProductStyles.fieldLabel, addProductGlassStyles.fieldLabel]}>
              {req(t('addProduct.fieldTitle'))}
            </RNText>
            <AppTextInput
              style={[addProductStyles.pillInput, addProductGlassStyles.surface, addProductGlassStyles.inputText]}
              value={form.title}
              onChangeText={form.setTitle}
              placeholder={t('addProduct.fieldTitlePlaceholder')}
              placeholderTextColor={themeColors.glass.placeholder}
            />
          </View>

          <View style={addProductStyles.field}>
            <RNText style={[addProductStyles.fieldLabel, addProductGlassStyles.fieldLabel]}>
              {req(t('addProduct.fieldDescription'))}
            </RNText>
            <AppTextInput
              style={[
                addProductStyles.pillInput,
                addProductStyles.pillInputMultiline,
                addProductGlassStyles.surface,
                addProductGlassStyles.inputText,
              ]}
              value={form.description}
              onChangeText={form.setDescription}
              placeholder={t('addProduct.fieldDescriptionPlaceholder')}
              placeholderTextColor={themeColors.glass.placeholder}
              multiline
            />
          </View>

          <View style={addProductStyles.field}>
            <RNText style={[addProductStyles.fieldLabel, addProductGlassStyles.fieldLabel]}>
              {req(t('addProduct.fieldQuantity'))}
            </RNText>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={[styles.stepperBtn, addProductGlassStyles.surface]}
                onPress={form.decrementQuantity}
              >
                <Minus size={20} color={themeColors.glass.text} />
              </TouchableOpacity>
              <View style={[styles.stepperValueWrap, addProductGlassStyles.surface]}>
                <RNText style={styles.stepperValue}>{form.quantity}</RNText>
              </View>
              <TouchableOpacity
                style={[styles.stepperBtn, addProductGlassStyles.surface]}
                onPress={form.incrementQuantity}
              >
                <Plus size={20} color={themeColors.glass.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <RNText style={[addProductStyles.sectionTitle, addProductGlassStyles.sectionTitle]}>
          {t('addProduct.fieldPrice')}
        </RNText>
        <SaleModeTabs value={saleMode} onChange={form.setLiveSaleMode} />

        <View style={addProductStyles.fields}>
          {saleMode === 'buy_now' ? (
            <View style={addProductStyles.field}>
              <RNText style={[addProductStyles.fieldLabel, addProductGlassStyles.fieldLabel]}>
                {req(t('addProduct.fieldPrice'))}
              </RNText>
              <View style={[addProductStyles.priceInputWrap, addProductGlassStyles.surface]}>
                <RNText style={[addProductStyles.pricePrefix, addProductGlassStyles.inputText]}>$</RNText>
                <AppTextInput
                  style={[addProductStyles.priceInput, addProductGlassStyles.inputText]}
                  value={form.price}
                  onChangeText={form.setPrice}
                  placeholder={t('addProduct.fieldMinOfferPlaceholder')}
                  placeholderTextColor={themeColors.glass.placeholder}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
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
                      <RNText style={[styles.raffleTitle, addProductGlassStyles.rowTitle]}>
                        {t(mode.titleKey)}
                      </RNText>
                      <RNText style={[styles.raffleDesc, addProductGlassStyles.rowHint]}>
                        {t(mode.descKey)}
                      </RNText>
                    </View>
                    <View
                      style={[
                        styles.raffleRadio,
                        addProductGlassStyles.radio,
                        active && addProductGlassStyles.radioOn,
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {/* Orden Figma 698:11849: Peso antes de los campos de subasta; SKU al final. */}
          <GlassSelectField
            label={req(t('addProduct.fieldWeight'))}
            value={form.weightLabel}
            placeholder={t('addProduct.fieldWeightPlaceholder')}
            onPress={() => form.setActiveDrawer('weight')}
          />

          {saleMode === 'auction' ? (
            <>
              <View style={addProductStyles.field}>
                <RNText style={[addProductStyles.fieldLabel, addProductGlassStyles.fieldLabel]}>
                  {req(t('stream.addProductMinBid'))}
                </RNText>
                <View style={[addProductStyles.priceInputWrap, addProductGlassStyles.surface]}>
                  <RNText style={[addProductStyles.pricePrefix, addProductGlassStyles.inputText]}>$</RNText>
                  <AppTextInput
                    style={[addProductStyles.priceInput, addProductGlassStyles.inputText]}
                    value={form.minBidPrice}
                    onChangeText={form.setMinBidPrice}
                    placeholder={t('addProduct.fieldMinOfferPlaceholder')}
                    placeholderTextColor={themeColors.glass.placeholder}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <View style={addProductStyles.field}>
                <RNText style={[addProductStyles.fieldLabel, addProductGlassStyles.fieldLabel]}>
                  {req(t('stream.addProductAuctionTime'))}
                </RNText>
                {/* Cards de selección única (Figma 1094:780): fijan la duración y el tope de extensión. */}
                <View style={styles.durationRow}>
                  {AUCTION_DURATION_OPTIONS.map((seconds) => {
                    const active = form.auctionDuration === seconds;
                    return (
                      <TouchableOpacity
                        key={seconds}
                        style={[
                          styles.durationCard,
                          addProductGlassStyles.surface,
                          active && styles.durationCardOn,
                        ]}
                        onPress={() => form.setAuctionDuration(seconds)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                      >
                        <RNText style={styles.durationCardText}>{`${seconds}s`}</RNText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.extensionInfo}>
                  <RNText style={styles.extensionTitle}>
                    {t('stream.auctionExtensionTitle')}
                  </RNText>
                  <RNText style={styles.extensionSubtitle}>
                    {t('stream.auctionExtensionSubtitle')}
                  </RNText>
                  <RNText style={styles.extensionDesc}>
                    {t('stream.auctionExtensionDesc', { seconds: form.auctionDuration })}
                  </RNText>
                </View>
              </View>
            </>
          ) : null}

          <View style={addProductStyles.field}>
            <RNText style={[addProductStyles.fieldLabel, addProductGlassStyles.fieldLabel]}>
              {t('addProduct.fieldSku')}
            </RNText>
            <AppTextInput
              style={[addProductStyles.pillInput, addProductGlassStyles.surface, addProductGlassStyles.inputText]}
              value={form.sku}
              onChangeText={form.setSku}
              placeholder={t('addProduct.fieldSkuPlaceholder')}
              placeholderTextColor={themeColors.glass.placeholder}
              autoCapitalize="characters"
            />
          </View>
        </View>
      </KeyboardDismissScrollView>

    </GlassFullScreenModal>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueWrap: {
    flex: 1,
    minHeight: 52,
    borderRadius: 100,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    color: themeColors.glass.text,
  },
  /** Cards 10s/7s/5s — geometría Figma 1094:784 (45 de alto, radio 8), skin glass. */
  durationRow: {
    flexDirection: 'row',
    gap: 10,
  },
  durationCard: {
    flex: 1,
    minHeight: 45,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  durationCardOn: {
    borderColor: themeColors.primary,
    backgroundColor: 'rgba(104, 92, 240, 0.25)',
  },
  durationCardText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.text,
  },
  /**
   * Bloque informativo de la extensión anti-sniping (Figma 1094:770). Sin el
   * toggle del diseño: la extensión no es configurable por producto en backend.
   */
  extensionInfo: {
    gap: 8,
    marginTop: 8,
  },
  extensionTitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 16,
    lineHeight: 20,
    color: themeColors.glass.text,
  },
  extensionSubtitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.textMuted,
  },
  extensionDesc: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 20,
    color: themeColors.glass.textMuted,
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
  },
  raffleDesc: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 16,
  },
  raffleRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
});
