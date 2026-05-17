import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StartLiveCategoriesDrawer } from '../startLive/StartLiveCategoriesDrawer';
import { AddProductPackageTierDrawer } from './AddProductPackageTierDrawer';
import { AddProductSaleFormatDrawer } from './AddProductSaleFormatDrawer';
import { AddProductConditionDrawer } from './AddProductConditionDrawer';
import { AddProductPhotoSourceDrawer } from './AddProductPhotoSourceDrawer';
import { MAX_PRODUCT_PHOTOS } from '../../../hooks/useAddProductForm';
import type { AddProductDrawer } from '../../../hooks/useAddProductForm';
import type {
  PackageTierId,
  ProductConditionId,
  SaleFormatId,
} from '../../../constants/productWeightPresets';

export interface AddProductHostProps {
  activeDrawer: AddProductDrawer;
  categoryUuid: string | null;
  saleFormat: SaleFormatId | null;
  packageTier: PackageTierId | null;
  weightKg: number | null;
  condition: ProductConditionId | null;
  onCloseDrawer: () => void;
  onCategory: (uuid: string) => void;
  onSaleFormat: (value: SaleFormatId) => void;
  onPackageTier: (tier: PackageTierId, weightKg: number | null) => void;
  onCondition: (value: ProductConditionId) => void;
  photoCount: number;
  onTakePhoto: () => void;
  onChooseGallery: () => void;
}

export const AddProductHost: React.FC<AddProductHostProps> = ({
  activeDrawer,
  categoryUuid,
  saleFormat,
  packageTier,
  weightKg,
  condition,
  onCloseDrawer,
  onCategory,
  onSaleFormat,
  onPackageTier,
  onCondition,
  photoCount,
  onTakePhoto,
  onChooseGallery,
}) => {
  const manualTierKg =
    packageTier != null && weightKg != null ? String(weightKg) : '';

  return (
    <View style={styles.host} pointerEvents="box-none">
      <AddProductPhotoSourceDrawer
        visible={activeDrawer === 'photos'}
        photoCount={photoCount}
        maxPhotos={MAX_PRODUCT_PHOTOS}
        onClose={onCloseDrawer}
        onTakePhoto={onTakePhoto}
        onChooseGallery={onChooseGallery}
      />
      <StartLiveCategoriesDrawer
        visible={activeDrawer === 'category'}
        selectionMode="single"
        titleKey="addProduct.categoryTitle"
        subtitleKey="addProduct.categorySubtitle"
        initialSelected={categoryUuid ? [categoryUuid] : []}
        onClose={onCloseDrawer}
        onContinue={(uuids) => {
          if (uuids[0]) {
            onCategory(uuids[0]);
          }
          onCloseDrawer();
        }}
      />
      <AddProductPackageTierDrawer
        visible={activeDrawer === 'weight'}
        initialTier={packageTier}
        initialManualKg={manualTierKg}
        onClose={onCloseDrawer}
        onConfirm={(tier, kg) => {
          onPackageTier(tier, kg);
          onCloseDrawer();
        }}
      />
      <AddProductSaleFormatDrawer
        visible={activeDrawer === 'saleFormat'}
        initialValue={saleFormat}
        onClose={onCloseDrawer}
        onConfirm={(value) => {
          onSaleFormat(value);
          onCloseDrawer();
        }}
      />
      <AddProductConditionDrawer
        visible={activeDrawer === 'condition'}
        initialValue={condition}
        onClose={onCloseDrawer}
        onConfirm={(value) => {
          onCondition(value);
          onCloseDrawer();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 300,
    elevation: 300,
  },
});
