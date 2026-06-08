import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { createProduct, uploadProductImages } from '../api/productsApi';
import { ApiError } from '../api/authApi';
import type { SaleFormatId } from '../constants/productWeightPresets';
import {
  launchPhotoCameraNow,
  launchPhotoLibraryNow,
  photosFromPickerResponse,
  showMediaPickerError,
} from '../utils/mediaPicker';
import { MAX_PRODUCT_PHOTOS } from './useAddProductForm';

export type SellerLivePhotoDrawer = 'none' | 'photos';

export interface LocalPhoto {
  uri: string;
  type?: string;
  name?: string;
}

function sanitizeShortText(value: string, maxLength: number): string {
  return value.replace(/\s+/g, ' ').replace(/^\s/, '').slice(0, maxLength);
}

function sanitizePrice(value: string): string {
  const normalized = value.replace(',', '.').replace(/[^0-9.]/g, '');
  const [whole = '', ...decimalParts] = normalized.split('.');
  const decimals = decimalParts.join('').slice(0, 2);
  const cleanWhole = whole.replace(/^0+(?=\d)/, '').slice(0, 9);
  return decimalParts.length > 0 ? `${cleanWhole || '0'}.${decimals}` : cleanWhole;
}

export interface SellerLiveAddProductDefaults {
  categoryUuid: string | null;
  saleFormat: SaleFormatId;
  roomId: string;
}

export function useSellerLiveAddProduct(
  options: SellerLiveAddProductDefaults & {
    onSuccess: () => void;
    onAfterMediaPicker?: () => void;
  },
) {
  const { t } = useTranslation();
  const { categoryUuid, saleFormat, roomId, onSuccess, onAfterMediaPicker } = options;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [minOfferPrice, setMinOfferPrice] = useState('');
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [activeDrawer, setActiveDrawer] = useState<SellerLivePhotoDrawer>('none');
  const [submitting, setSubmitting] = useState(false);

  const handleTitleChange = useCallback((value: string) => {
    setTitle(sanitizeShortText(value, 80));
  }, []);

  const handleDescriptionChange = useCallback((value: string) => {
    setDescription(value.replace(/^\s/, '').slice(0, 500));
  }, []);

  const handlePriceChange = useCallback((value: string) => {
    setMinOfferPrice(sanitizePrice(value));
  }, []);

  const reset = useCallback(() => {
    setTitle('');
    setDescription('');
    setMinOfferPrice('');
    setPhotos([]);
    setActiveDrawer('none');
    setSubmitting(false);
  }, []);

  const appendPhotos = useCallback(
    (incoming: LocalPhoto[]) => {
      if (!incoming.length) return;
      setPhotos((prev) => {
        const room = MAX_PRODUCT_PHOTOS - prev.length;
        if (room <= 0) {
          Alert.alert(t('common.appName'), t('addProduct.maxPhotos', { count: MAX_PRODUCT_PHOTOS }));
          return prev;
        }
        return [...prev, ...incoming.slice(0, room)];
      });
    },
    [t],
  );

  const pickerCallbacks = useCallback(
    () => ({
      onAfter: onAfterMediaPicker,
      onError: (message: string) => showMediaPickerError(t('common.appName'), message),
    }),
    [onAfterMediaPicker, t],
  );

  const openGallery = useCallback(() => {
    launchPhotoLibraryNow(
      { mediaType: 'photo', selectionLimit: MAX_PRODUCT_PHOTOS },
      (res) => appendPhotos(photosFromPickerResponse(res)),
      pickerCallbacks(),
    );
  }, [appendPhotos, pickerCallbacks]);

  const openCamera = useCallback(() => {
    launchPhotoCameraNow(
      { mediaType: 'photo', cameraType: 'back', saveToPhotos: true },
      (res) => appendPhotos(photosFromPickerResponse(res)),
      {
        ...pickerCallbacks(),
        onError: () => showMediaPickerError(t('common.appName'), t('stream.addProductCameraBusy')),
      },
    );
  }, [appendPhotos, pickerCallbacks, t]);

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
    if (!categoryUuid) return t('stream.addProductNoCategory');
    const price = parseFloat(minOfferPrice.replace(',', '.'));
    if (!Number.isFinite(price) || price <= 0) return t('addProduct.errorPrice');
    return null;
  }, [title, description, photos.length, categoryUuid, minOfferPrice, t]);

  const submit = useCallback(async () => {
    const err = validate();
    if (err) {
      Alert.alert(t('common.appName'), err);
      return;
    }
    const price = parseFloat(minOfferPrice.replace(',', '.'));
    setSubmitting(true);
    try {
      const imageUrls = await uploadProductImages(photos);
      await createProduct({
        title: title.trim(),
        description: description.trim(),
        base_price_cents: Math.round(price * 100),
        image_urls: imageUrls,
        interest_category_uuid: categoryUuid!,
        sale_format: saleFormat,
        package_tier: 'light',
        weight_kg: 0.25,
        condition: 'new',
        room_id: roomId,
        quantity_on_hand: 1,
      });
      onSuccess();
      reset();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t('addProduct.saveError');
      Alert.alert(t('common.appName'), msg);
    } finally {
      setSubmitting(false);
    }
  }, [
    validate,
    photos,
    title,
    description,
    minOfferPrice,
    categoryUuid,
    saleFormat,
    roomId,
    onSuccess,
    reset,
    t,
  ]);

  return {
    title,
    setTitle: handleTitleChange,
    description,
    setDescription: handleDescriptionChange,
    minOfferPrice,
    setMinOfferPrice: handlePriceChange,
    photos,
    pickPhotos,
    openCamera,
    openGallery,
    removePhoto,
    canAddMorePhotos: photos.length < MAX_PRODUCT_PHOTOS,
    activeDrawer,
    setActiveDrawer,
    submitting,
    submit,
    reset,
  };
}
