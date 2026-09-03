import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  launchPhotoCameraNow,
  launchPhotoLibraryNow,
  photosFromPickerResponse,
  showMediaPickerError,
} from '../utils/mediaPicker';
import { createProduct, updateProduct, uploadProductImages, type ProductResponse } from '../api/productsApi';
import type { InterestCategoryItem } from '../api/types';
import type {
  PackageTierId,
  ProductConditionId,
  SaleFormatId,
} from '../constants/productWeightPresets';
import { PACKAGE_TIER_OPTIONS, SALE_FORMAT_OPTIONS } from '../constants/productWeightPresets';
import { ApiError } from '../api/authApi';
import { appAlert } from '../alerts';

export type AddProductDrawer =
  | 'none'
  | 'photos'
  | 'category'
  | 'saleFormat'
  | 'weight'
  | 'condition';

export interface ProductInitialValues {
  productId: string;
  title: string;
  description: string;
  /** Precio en unidad mayor (ej: "1200.50"). */
  price: string;
  sku: string;
  imageUrls: string[];
  sizes: string[];
  /** Colores en formato "Nombre|#RRGGBB". */
  colors: string[];
  categoryUuid: string | null;
  saleFormat: SaleFormatId | null;
  packageTier: PackageTierId | null;
  weightKg: number | null;
  condition: ProductConditionId | null;
  quantityOnHand: number;
}

export const MAX_PRODUCT_PHOTOS = 10;

export interface LocalPhoto {
  uri: string;
  type?: string;
  name?: string;
}

function sanitizeShortText(value: string, maxLength: number): string {
  return value.replace(/\s+/g, ' ').replace(/^\s/, '').slice(0, maxLength);
}

function sanitizeSku(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9-_]/g, '').slice(0, 32);
}

function sanitizePrice(value: string): string {
  const normalized = value.replace(',', '.').replace(/[^0-9.]/g, '');
  const [whole = '', ...decimalParts] = normalized.split('.');
  const decimals = decimalParts.join('').slice(0, 2);
  const cleanWhole = whole.replace(/^0+(?=\d)/, '').slice(0, 9);
  return decimalParts.length > 0 ? `${cleanWhole || '0'}.${decimals}` : cleanWhole;
}

export function useAddProductForm(options: {
  categories: InterestCategoryItem[];
  onSuccess: (product?: ProductResponse) => void;
  /** Si se provee, el hook trabaja en modo edición (PATCH). */
  initialValues?: ProductInitialValues;
}) {
  const { t } = useTranslation();
  const { categories, onSuccess, initialValues } = options;
  const isEditMode = initialValues != null;

  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [price, setPrice] = useState(initialValues?.price ?? '');
  const [sku, setSku] = useState(initialValues?.sku ?? '');
  // En edición, las fotos existentes son URLs remotas; se tratan como LocalPhoto
  // con uri = URL firmada. El backend acepta image_urls directamente.
  const [photos, setPhotos] = useState<LocalPhoto[]>(
    initialValues?.imageUrls.map((uri) => ({ uri })) ?? [],
  );
  const [sizes, setSizes] = useState<string[]>(initialValues?.sizes ?? []);
  const [colors, setColors] = useState<string[]>(initialValues?.colors ?? []);
  const [categoryUuid, setCategoryUuid] = useState<string | null>(initialValues?.categoryUuid ?? null);
  const [saleFormat, setSaleFormat] = useState<SaleFormatId | null>(initialValues?.saleFormat ?? null);
  const [packageTier, setPackageTier] = useState<PackageTierId | null>(initialValues?.packageTier ?? null);
  const [weightKg, setWeightKg] = useState<number | null>(initialValues?.weightKg ?? null);
  const [condition, setCondition] = useState<ProductConditionId | null>(initialValues?.condition ?? null);
  const [activeDrawer, setActiveDrawer] = useState<AddProductDrawer>('none');
  const [submitting, setSubmitting] = useState(false);

  const handleTitleChange = useCallback((value: string) => {
    setTitle(sanitizeShortText(value, 80));
  }, []);

  const handleDescriptionChange = useCallback((value: string) => {
    setDescription(value.replace(/^\s/, '').slice(0, 500));
  }, []);

  const handlePriceChange = useCallback((value: string) => {
    setPrice(sanitizePrice(value));
  }, []);

  const handleSkuChange = useCallback((value: string) => {
    setSku(sanitizeSku(value));
  }, []);

  const categoryLabel = useMemo(() => {
    if (!categoryUuid) return null;
    return categories.find((c) => c.uuid === categoryUuid)?.label ?? null;
  }, [categoryUuid, categories]);

  const saleFormatLabel = useMemo(() => {
    if (!saleFormat) return null;
    const opt = SALE_FORMAT_OPTIONS.find((o) => o.id === saleFormat);
    return opt ? t(opt.labelKey) : null;
  }, [saleFormat, t]);

  const packageTierLabel = useMemo(() => {
    if (!packageTier) return null;
    if (packageTier === 'custom') return t('addProduct.tierCustom');
    const opt = PACKAGE_TIER_OPTIONS.find((o) => o.id === packageTier);
    return opt ? t(opt.labelKey) : null;
  }, [packageTier, t]);

  const weightLabel = useMemo(() => {
    if (!packageTier) return null;
    const tierLabel = packageTierLabel ?? '';
    if (weightKg == null) return tierLabel;
    const value =
      packageTier === 'light'
        ? `${Math.round(weightKg * 1000)} g`
        : `${Number(weightKg.toFixed(2))} kg`;
    return `${tierLabel} · ${value}`;
  }, [packageTier, packageTierLabel, weightKg]);

  const conditionLabel = useMemo(() => {
    if (!condition) return null;
    const key =
      condition === 'new'
        ? 'addProduct.conditionNew'
        : condition === 'lightly_used'
          ? 'addProduct.conditionLightUse'
          : 'addProduct.conditionUsed';
    return t(key);
  }, [condition, t]);

  const appendPhotos = useCallback((incoming: LocalPhoto[]) => {
    if (!incoming.length) return;
    setPhotos((prev) => {
      const uris = new Set(prev.map((p) => p.uri));
      const merged = [...prev];
      for (const photo of incoming) {
        if (merged.length >= MAX_PRODUCT_PHOTOS) break;
        if (!uris.has(photo.uri)) {
          uris.add(photo.uri);
          merged.push(photo);
        }
      }
      return merged;
    });
  }, []);

  const openCamera = useCallback(() => {
    if (photos.length >= MAX_PRODUCT_PHOTOS) {
      appAlert(t('common.appName'), t('addProduct.maxPhotos', { count: MAX_PRODUCT_PHOTOS }));
      return;
    }
    launchPhotoCameraNow(
      { mediaType: 'photo', cameraType: 'back', saveToPhotos: true },
      (response) => appendPhotos(photosFromPickerResponse(response)),
      {
        onError: (message) => showMediaPickerError(t('common.appName'), message),
      },
    );
  }, [appendPhotos, photos.length, t]);

  const openGallery = useCallback(() => {
    const remaining = MAX_PRODUCT_PHOTOS - photos.length;
    if (remaining <= 0) {
      appAlert(t('common.appName'), t('addProduct.maxPhotos', { count: MAX_PRODUCT_PHOTOS }));
      return;
    }
    launchPhotoLibraryNow(
      { mediaType: 'photo', selectionLimit: remaining },
      (response) => appendPhotos(photosFromPickerResponse(response)),
      {
        onError: (message) => showMediaPickerError(t('common.appName'), message),
      },
    );
  }, [appendPhotos, photos.length, t]);

  const pickPhotos = useCallback(() => {
    setActiveDrawer('photos');
  }, []);

  const removePhoto = useCallback((uri: string) => {
    setPhotos((prev) => prev.filter((p) => p.uri !== uri));
  }, []);

  const validate = useCallback((): string | null => {
    if (!title.trim()) return t('addProduct.errorTitle');
    if (!description.trim()) return t('addProduct.errorDescription');
    if (!photos.length) return t('addProduct.errorPhotos');
    if (!categoryUuid) return t('addProduct.errorCategory');
    if (!saleFormat) return t('addProduct.errorSaleFormat');
    if (!packageTier || weightKg == null || weightKg <= 0) return t('addProduct.errorWeight');
    if (!condition) return t('addProduct.errorCondition');
    const parsedPrice = parseFloat(price.replace(',', '.'));
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) return t('addProduct.errorPrice');
    return null;
  }, [
    title,
    description,
    photos.length,
    categoryUuid,
    saleFormat,
    packageTier,
    weightKg,
    condition,
    price,
    t,
  ]);

  const submit = useCallback(async () => {
    const err = validate();
    if (err) {
      appAlert(t('common.appName'), err);
      return;
    }
    const parsedPrice = parseFloat(price.replace(',', '.'));
    setSubmitting(true);
    try {
      // En modo edición solo subimos las fotos que sean locales (uri no empieza con http).
      const localPhotos = photos.filter((p) => !p.uri.startsWith('http'));
      const existingUrls = photos.filter((p) => p.uri.startsWith('http')).map((p) => p.uri);
      const newImageUrls = localPhotos.length > 0 ? await uploadProductImages(localPhotos) : [];
      const imageUrls = [...existingUrls, ...newImageUrls];

      let result: ProductResponse;
      if (isEditMode && initialValues) {
        result = await updateProduct(initialValues.productId, {
          title: title.trim(),
          description: description.trim() || null,
          base_price_cents: Math.round(parsedPrice * 100),
          image_urls: imageUrls,
          sizes,
          colors,
          sku: sku.trim() || null,
          quantity_on_hand: initialValues.quantityOnHand,
        });
      } else {
        result = await createProduct({
          title: title.trim(),
          description: description.trim(),
          base_price_cents: Math.round(parsedPrice * 100),
          image_urls: imageUrls,
          interest_category_uuid: categoryUuid!,
          sale_format: saleFormat!,
          package_tier: packageTier!,
          weight_kg: weightKg,
          condition: condition!,
          sku: sku.trim() || null,
          sizes,
          colors,
        });
      }
      onSuccess(result);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t('addProduct.saveError');
      appAlert(t('common.appName'), msg);
    } finally {
      setSubmitting(false);
    }
  }, [
    validate,
    photos,
    title,
    description,
    price,
    categoryUuid,
    saleFormat,
    packageTier,
    weightKg,
    condition,
    sku,
    sizes,
    colors,
    isEditMode,
    initialValues,
    onSuccess,
    t,
  ]);

  return {
    isEditMode,
    title,
    setTitle: handleTitleChange,
    description,
    setDescription: handleDescriptionChange,
    price,
    setPrice: handlePriceChange,
    sku,
    setSku: handleSkuChange,
    photos,
    pickPhotos,
    openCamera,
    openGallery,
    removePhoto,
    maxPhotos: MAX_PRODUCT_PHOTOS,
    canAddMorePhotos: photos.length < MAX_PRODUCT_PHOTOS,
    sizes,
    setSizes,
    colors,
    setColors,
    categoryUuid,
    categoryLabel,
    setCategoryUuid,
    saleFormat,
    saleFormatLabel,
    setSaleFormat,
    packageTier,
    packageTierLabel,
    setPackageTier,
    weightKg,
    weightLabel,
    setWeightKg,
    condition,
    conditionLabel,
    setCondition,
    activeDrawer,
    setActiveDrawer,
    submitting,
    submit,
  };
}
