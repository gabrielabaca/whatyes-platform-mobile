import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createProduct, uploadProductImages } from '../api/productsApi';
import type {
  InterestCategoryItem,
  LiveSaleMode,
  ProductListScope,
  RaffleParticipationMode,
} from '../api/types';
import { ApiError } from '../api/authApi';
import type { PackageTierId, SaleFormatId } from '../constants/productWeightPresets';
import { PACKAGE_TIER_OPTIONS } from '../constants/productWeightPresets';
import {
  launchPhotoCameraNow,
  launchPhotoLibraryNow,
  photosFromPickerResponse,
  showMediaPickerError,
} from '../utils/mediaPicker';
import { MAX_PRODUCT_PHOTOS } from './useAddProductForm';
import { appAlert } from '../alerts';

/** Drawers que el form in-live puede abrir por encima de la pantalla. */
export type SellerLiveDrawer = 'none' | 'photos' | 'category' | 'weight' | 'saleFormat';

/**
 * Opciones de tiempo límite de subasta (Figma 698:11652 / 1094:780). Selección
 * única en cards, no input libre: el primero es el default de diseño. El valor
 * también actúa de tope de la extensión anti-sniping (ver auction_service).
 */
export const AUCTION_DURATION_OPTIONS = [10, 7, 5] as const;
export type AuctionDurationOption = (typeof AUCTION_DURATION_OPTIONS)[number];
const DEFAULT_AUCTION_DURATION: AuctionDurationOption = AUCTION_DURATION_OPTIONS[0];

export interface LocalPhoto {
  uri: string;
  type?: string;
  name?: string;
}

const DEFAULT_TIER: PackageTierId = 'light';

function tierDefaultKg(tier: PackageTierId): number {
  return PACKAGE_TIER_OPTIONS.find((o) => o.id === tier)?.defaultKg ?? 0.25;
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

export interface SellerLiveAddProductDefaults {
  /** Categoría inicial (del vivo); editable por el vendedor. */
  categoryUuid: string | null;
  categories: InterestCategoryItem[];
  /** Formato de venta inicial del producto (individual/lote); editable por el vendedor. */
  saleFormat: SaleFormatId;
  roomId: string;
  scope: ProductListScope;
  defaultSaleMode: LiveSaleMode;
}

export function useSellerLiveAddProduct(
  options: SellerLiveAddProductDefaults & {
    onSuccess: () => void;
    onAfterMediaPicker?: () => void;
  },
) {
  const { t } = useTranslation();
  const {
    categoryUuid: initialCategoryUuid,
    categories,
    saleFormat: initialSaleFormat,
    roomId,
    scope,
    defaultSaleMode,
    onSuccess,
    onAfterMediaPicker,
  } = options;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [minBidPrice, setMinBidPrice] = useState('');
  const [auctionDuration, setAuctionDuration] = useState<AuctionDurationOption>(
    DEFAULT_AUCTION_DURATION,
  );
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [liveSaleMode, setLiveSaleMode] = useState<LiveSaleMode>(defaultSaleMode);
  const [categoryUuid, setCategoryUuid] = useState<string | null>(initialCategoryUuid);
  const [saleFormat, setSaleFormat] = useState<SaleFormatId>(initialSaleFormat);
  const [packageTier, setPackageTier] = useState<PackageTierId>(DEFAULT_TIER);
  const [weightKg, setWeightKg] = useState<number>(tierDefaultKg(DEFAULT_TIER));
  const [raffleMode, setRaffleMode] = useState<RaffleParticipationMode>('everyone');
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [activeDrawer, setActiveDrawer] = useState<SellerLiveDrawer>('none');
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

  const handleMinBidChange = useCallback((value: string) => {
    setMinBidPrice(sanitizePrice(value));
  }, []);

  const handleSkuChange = useCallback((value: string) => {
    setSku(sanitizeSku(value));
  }, []);

  const handlePackageTierChange = useCallback((tier: PackageTierId, kg: number | null) => {
    setPackageTier(tier);
    setWeightKg(kg != null ? kg : tierDefaultKg(tier));
  }, []);

  const categoryLabel = useMemo(() => {
    if (!categoryUuid) return null;
    return categories.find((c) => c.uuid === categoryUuid)?.label ?? null;
  }, [categoryUuid, categories]);

  const weightLabel = useMemo(() => {
    const opt = PACKAGE_TIER_OPTIONS.find((o) => o.id === packageTier);
    if (!opt) return null;
    const value = weightKg < 1 ? `${Math.round(weightKg * 1000)} g` : `${Number(weightKg.toFixed(2))} kg`;
    return `${t(opt.labelKey)} · ${value}`;
  }, [packageTier, weightKg, t]);

  const reset = useCallback(() => {
    setTitle('');
    setDescription('');
    setPrice('');
    setMinBidPrice('');
    setAuctionDuration(DEFAULT_AUCTION_DURATION);
    setSku('');
    setQuantity(1);
    setLiveSaleMode(defaultSaleMode);
    setCategoryUuid(initialCategoryUuid);
    setSaleFormat(initialSaleFormat);
    setPackageTier(DEFAULT_TIER);
    setWeightKg(tierDefaultKg(DEFAULT_TIER));
    setRaffleMode('everyone');
    setPhotos([]);
    setActiveDrawer('none');
    setSubmitting(false);
  }, [defaultSaleMode, initialCategoryUuid, initialSaleFormat]);

  const appendPhotos = useCallback(
    (incoming: LocalPhoto[]) => {
      if (!incoming.length) return;
      setPhotos((prev) => {
        const room = MAX_PRODUCT_PHOTOS - prev.length;
        if (room <= 0) {
          appAlert(t('common.appName'), t('addProduct.maxPhotos', { count: MAX_PRODUCT_PHOTOS }));
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

  const incrementQuantity = useCallback(() => {
    setQuantity((q) => Math.min(999, q + 1));
  }, []);

  const decrementQuantity = useCallback(() => {
    setQuantity((q) => Math.max(1, q - 1));
  }, []);

  const validate = useCallback((): string | null => {
    if (!title.trim()) return t('addProduct.errorTitle');
    if (!description.trim()) return t('addProduct.errorDescription');
    if (!photos.length) return t('addProduct.errorPhotos');
    if (!categoryUuid) return t('stream.addProductNoCategory');
    if (!(weightKg > 0)) return t('addProduct.errorWeight');

    if (liveSaleMode === 'buy_now') {
      const p = parseFloat(price.replace(',', '.'));
      if (!Number.isFinite(p) || p <= 0) return t('addProduct.errorPrice');
    }
    if (liveSaleMode === 'auction') {
      const minBid = parseFloat(minBidPrice.replace(',', '.'));
      if (!Number.isFinite(minBid) || minBid <= 0) return t('addProduct.errorPrice');
      if (!AUCTION_DURATION_OPTIONS.includes(auctionDuration)) {
        return t('stream.addProductAuctionTime');
      }
    }
    return null;
  }, [
    title,
    description,
    photos.length,
    categoryUuid,
    weightKg,
    liveSaleMode,
    price,
    minBidPrice,
    auctionDuration,
    t,
  ]);

  const buildPayload = useCallback(
    (status: 'draft' | 'published') => {
      let basePriceCents = 100;
      let minBidCents: number | undefined;
      let auctionDurationSeconds: number | undefined;

      if (liveSaleMode === 'buy_now') {
        basePriceCents = Math.round(parseFloat(price.replace(',', '.')) * 100);
      } else if (liveSaleMode === 'auction') {
        minBidCents = Math.round(parseFloat(minBidPrice.replace(',', '.')) * 100);
        basePriceCents = minBidCents;
        auctionDurationSeconds = auctionDuration;
      }

      return {
        title: title.trim(),
        description: description.trim(),
        base_price_cents: basePriceCents,
        image_urls: [] as string[],
        interest_category_uuid: categoryUuid!,
        sale_format: saleFormat,
        package_tier: packageTier === 'custom' ? 'light' : packageTier,
        weight_kg: weightKg,
        condition: 'new' as const,
        sku: sku.trim() || null,
        scope,
        quantity_on_hand: quantity,
        room_id: roomId,
        live_sale_mode: status === 'published' ? liveSaleMode : undefined,
        min_bid_cents: minBidCents,
        auction_duration_seconds: auctionDurationSeconds,
        raffle_participation_mode: liveSaleMode === 'raffle' ? raffleMode : undefined,
        status,
      };
    },
    [
      liveSaleMode,
      price,
      minBidPrice,
      auctionDuration,
      title,
      description,
      categoryUuid,
      saleFormat,
      packageTier,
      weightKg,
      scope,
      quantity,
      roomId,
      sku,
      raffleMode,
    ],
  );

  const submitWithStatus = useCallback(
    async (status: 'draft' | 'published') => {
      const err = validate();
      if (err) {
        appAlert(t('common.appName'), err);
        return;
      }
      setSubmitting(true);
      try {
        const imageUrls = await uploadProductImages(photos);
        const payload = buildPayload(status);
        await createProduct({ ...payload, image_urls: imageUrls });
        onSuccess();
        reset();
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : t('addProduct.saveError');
        appAlert(t('common.appName'), msg);
      } finally {
        setSubmitting(false);
      }
    },
    [validate, photos, buildPayload, onSuccess, reset, t],
  );

  const submitPublish = useCallback(() => submitWithStatus('published'), [submitWithStatus]);
  const submitDraft = useCallback(() => submitWithStatus('draft'), [submitWithStatus]);

  return {
    title,
    setTitle: handleTitleChange,
    description,
    setDescription: handleDescriptionChange,
    price,
    setPrice: handlePriceChange,
    minBidPrice,
    setMinBidPrice: handleMinBidChange,
    auctionDuration,
    setAuctionDuration,
    sku,
    setSku: handleSkuChange,
    quantity,
    incrementQuantity,
    decrementQuantity,
    liveSaleMode,
    setLiveSaleMode,
    categoryUuid,
    setCategoryUuid,
    categoryLabel,
    saleFormat,
    setSaleFormat,
    packageTier,
    weightKg,
    weightLabel,
    setPackageTier: handlePackageTierChange,
    raffleMode,
    setRaffleMode,
    photos,
    pickPhotos,
    openCamera,
    openGallery,
    removePhoto,
    canAddMorePhotos: photos.length < MAX_PRODUCT_PHOTOS,
    activeDrawer,
    setActiveDrawer,
    submitting,
    submitPublish,
    submitDraft,
    reset,
  };
}
