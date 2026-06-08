import React from 'react';
import {
  View,
  ScrollView,
  Text as RNText,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ImageUp, Plus, X } from 'lucide-react-native';
import { useInterestCategories } from '../../../hooks/useInterestCategories';
import { useAddProductForm } from '../../../hooks/useAddProductForm';
import { AddProductSelectField } from '../../organisms/addProduct/AddProductSelectField';
import { AddProductHost } from '../../organisms/addProduct/AddProductHost';
import { AddProductSuccessCelebration } from '../../organisms/addProduct/AddProductSuccessCelebration';
import { addProductStyles } from '../../organisms/addProduct/addProductStyles';
import type { PackageTierId, ProductConditionId, SaleFormatId } from '../../../constants/productWeightPresets';

export interface AddProductScreenProps {
  onCancel: () => void;
  onSaved: () => void;
}

/** Figma 536-26495 — carga de producto */
export const AddProductScreen: React.FC<AddProductScreenProps> = ({ onCancel, onSaved }) => {
  const { t } = useTranslation();
  const { categories, loadOnce } = useInterestCategories();
  const [successVisible, setSuccessVisible] = React.useState(false);

  React.useEffect(() => {
    loadOnce();
  }, [loadOnce]);

  const form = useAddProductForm({
    categories,
    onSuccess: () => setSuccessVisible(true),
  });

  const handleSuccessDismiss = React.useCallback(() => {
    setSuccessVisible(false);
    onSaved();
  }, [onSaved]);

  return (
    <>
      <ScrollView
        style={addProductStyles.screen}
        contentContainerStyle={addProductStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={addProductStyles.tipsBanner} activeOpacity={0.85}>
          <View style={addProductStyles.tipsTextCol}>
            <RNText style={addProductStyles.tipsTitle}>{t('addProduct.tipsTitle')}</RNText>
            <RNText style={addProductStyles.tipsBody}>{t('addProduct.tipsBody')}</RNText>
          </View>
          <View style={addProductStyles.tipsArrow}>
            <ArrowRight size={20} color="#685CF0" />
          </View>
        </TouchableOpacity>

        <RNText style={addProductStyles.sectionTitle}>{t('addProduct.screenTitle')}</RNText>

        {form.photos.length === 0 ? (
          <TouchableOpacity style={addProductStyles.photoBox} onPress={form.pickPhotos} activeOpacity={0.85}>
            <RNText style={addProductStyles.photoBoxLabel}>{t('addProduct.photosLabel')}</RNText>
            <ImageUp size={24} color="#71717B" />
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
                  accessibilityLabel={t('addProduct.removePhoto')}
                >
                  <X size={14} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ))}
            {form.canAddMorePhotos ? (
              <TouchableOpacity
                style={addProductStyles.photoAddTile}
                onPress={form.pickPhotos}
                activeOpacity={0.85}
              >
                <Plus size={20} color="#685CF0" />
                <RNText style={addProductStyles.photoAddTileLabel}>
                  {t('addProduct.addMorePhotos')}
                </RNText>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
        {form.photos.length > 0 ? (
          <RNText style={addProductStyles.photoCountHint}>
            {t('addProduct.photosCount', {
              count: form.photos.length,
              max: form.maxPhotos,
            })}
          </RNText>
        ) : null}

        <View style={addProductStyles.fields}>
          <View style={addProductStyles.field}>
            <RNText style={addProductStyles.fieldLabel}>{t('addProduct.fieldTitle')}</RNText>
            <TextInput
              style={addProductStyles.pillInput}
              value={form.title}
              onChangeText={form.setTitle}
              placeholder={t('addProduct.fieldTitlePlaceholder')}
              placeholderTextColor="#BABABA"
            />
          </View>

          <View style={addProductStyles.field}>
            <RNText style={addProductStyles.fieldLabel}>{t('addProduct.fieldDescription')}</RNText>
            <TextInput
              style={[addProductStyles.pillInput, addProductStyles.pillInputMultiline]}
              value={form.description}
              onChangeText={form.setDescription}
              placeholder={t('addProduct.fieldDescriptionPlaceholder')}
              placeholderTextColor="#BABABA"
              multiline
            />
          </View>

          <AddProductSelectField
            label={t('addProduct.fieldCategory')}
            value={form.categoryLabel}
            placeholder={t('addProduct.fieldCategoryPlaceholder')}
            onPress={() => form.setActiveDrawer('category')}
          />

          <AddProductSelectField
            label={t('addProduct.fieldSaleFormat')}
            value={form.saleFormatLabel}
            placeholder={t('addProduct.fieldSaleFormatPlaceholder')}
            onPress={() => form.setActiveDrawer('saleFormat')}
          />

          <AddProductSelectField
            label={t('addProduct.fieldWeight')}
            value={form.weightLabel}
            placeholder={t('addProduct.fieldWeightPlaceholder')}
            onPress={() => form.setActiveDrawer('weight')}
          />

          <View style={addProductStyles.field}>
            <RNText style={addProductStyles.fieldLabel}>{t('addProduct.fieldMinOffer')}</RNText>
            <View style={addProductStyles.priceInputWrap}>
              {form.minOfferPrice ? (
                <RNText style={addProductStyles.pricePrefix}>$</RNText>
              ) : null}
              <TextInput
                style={addProductStyles.priceInput}
                value={form.minOfferPrice}
                onChangeText={form.setMinOfferPrice}
                placeholder={t('addProduct.fieldMinOfferPlaceholder')}
                placeholderTextColor="#BABABA"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <AddProductSelectField
            label={t('addProduct.fieldCondition')}
            value={form.conditionLabel}
            placeholder={t('addProduct.fieldConditionPlaceholder')}
            onPress={() => form.setActiveDrawer('condition')}
          />

          <View style={addProductStyles.field}>
            <RNText style={addProductStyles.fieldLabel}>{t('addProduct.fieldSku')}</RNText>
            <TextInput
              style={addProductStyles.pillInput}
              value={form.sku}
              onChangeText={form.setSku}
              placeholder={t('addProduct.fieldSkuPlaceholder')}
              placeholderTextColor="#BABABA"
            />
          </View>
        </View>

        <View style={addProductStyles.actions}>
          <TouchableOpacity
            style={[addProductStyles.primaryBtn, form.submitting && addProductStyles.primaryBtnDisabled]}
            onPress={form.submit}
            disabled={form.submitting}
            activeOpacity={0.85}
          >
            {form.submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <RNText style={addProductStyles.primaryBtnText}>{t('addProduct.save')}</RNText>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={addProductStyles.cancelBtn} onPress={onCancel} activeOpacity={0.85}>
            <RNText style={addProductStyles.cancelBtnText}>{t('addProduct.cancel')}</RNText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AddProductHost
        activeDrawer={form.activeDrawer}
        categoryUuid={form.categoryUuid}
        saleFormat={form.saleFormat}
        packageTier={form.packageTier}
        weightKg={form.weightKg}
        condition={form.condition}
        onCloseDrawer={() => form.setActiveDrawer('none')}
        onCategory={(uuid) => form.setCategoryUuid(uuid)}
        onSaleFormat={(value: SaleFormatId) => form.setSaleFormat(value)}
        onPackageTier={(tier: PackageTierId, kg) => {
          form.setPackageTier(tier);
          if (kg != null) {
            form.setWeightKg(kg);
          }
        }}
        onCondition={(value: ProductConditionId) => form.setCondition(value)}
        photoCount={form.photos.length}
        onTakePhoto={form.openCamera}
        onChooseGallery={form.openGallery}
      />

      <AddProductSuccessCelebration
        visible={successVisible}
        onDismiss={handleSuccessDismiss}
      />
    </>
  );
};
