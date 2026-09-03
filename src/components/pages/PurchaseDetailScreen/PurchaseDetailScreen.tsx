/**
 * Detalle de una compra — Figma 698-3403.
 * Secciones: resumen del producto, detalles de la compra, clip de la compra
 * (video de la subasta grabado por platform_livestream), estado del envío
 * (fulfillment_status + historial de service_delivery), detalle de pago,
 * información del vendedor, reseña y productos similares.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
  Share,
  ScrollView,
  Text as RNText,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Copy, ExternalLink, Pause, Play, Star, Tag, Video as VideoIcon, ImageUp, X } from 'lucide-react-native';
import Video from 'react-native-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconChevronLeft, IconShare, IconBell, IconChat } from '../../icons';
import { KeyboardDismissScrollView } from '../../atoms/KeyboardDismissScrollView';
import { AppTextInput } from '../../atoms/AppTextInput';
import { StarRatingInput } from '../../molecules/profile/StarRatingInput';
import { formatStreamPrice } from '../../atoms/stream/StreamPriceText';
import { useSellerFollow } from '../../../hooks/useSellerFollow';
import { useSellerNotifications } from '../../../hooks/useSellerNotifications';
import { PurchaseClipViewer } from '../../organisms/purchases/PurchaseClipViewer';
import { ContactModal } from '../../organisms/account/ContactModal';
import {
  getUserPublicProfile,
  createUserReview,
  uploadReviewImages,
  type UserPublicProfile,
} from '../../../api/profileApi';
import { isHandle } from '../../../utils/handle';
import {
  getMyPurchase,
  getMyPurchasePayment,
  getMyPurchaseTracking,
  getUserProfileProducts,
  type PurchaseItem,
  type PurchasePaymentDetail,
  type PurchaseShippingAddress,
  type PurchaseTracking,
  type UserProfileProductItem,
} from '../../../api/platformApi';
import {
  fulfillmentProgress,
  isFulfillmentFailure,
  normalizeFulfillmentStatus,
} from '../../../utils/fulfillment';
import { getPaymentIntentBySaleUuid, getPublicPaymentsConfig } from '../../../api/paymentsApi';
import { resolveMpWalletCheckoutUrl } from '../../../utils/mpWalletDeepLink';
import { formatCompactCount } from '../../../utils/formatCount';
import { writeClipboardText } from '../../../utils/clipboard';
import {
  BIO_PREVIEW_MAX_GRAPHEMES,
  graphemeCount,
  sliceGraphemes,
} from '../../../utils/grapheme';
import { storage } from '../../../utils/storage';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { useTheme } from '../../../context/ThemeContext';
import { APP_DOWNLOAD_URL } from '../../../constants/externalLinks';
import { appAlert } from '../../../alerts';
import { launchPhotoLibraryNow, photoFromUri } from '../../../utils/mediaPicker';
import { deferMediaPicker } from '../../../utils/deferMediaPicker';

const PRIMARY = themeColors.primary;
/** Paleta oscura: se aplica inline sobre los estilos estáticos (claro sin cambios). */
const D = themeColors.dark;
const TEXT = '#18181B';
const MUTED = '#6B7280';
const GOLD = '#EAB308';
const DANGER = themeColors.danger;
const CARD_BG = '#FAFAFF';
const ROW_BG = '#EFEFFA';
const MAX_REVIEW_IMAGES = 4;

function formatDateTime(epochSec: number, locale: string): string {
  const d = new Date(epochSec * 1000);
  const date = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
  return `${date}, ${time}h`;
}

/** "15 mayo" — formato corto del Figma para la fecha estimada de entrega. */
function formatDayMonth(epochSec: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(
    new Date(epochSec * 1000)
  );
}

function formatClipDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function cardBrandLabel(brand: string): string {
  const key = brand.trim().toLowerCase();
  const known: Record<string, string> = {
    visa: 'Visa',
    debvisa: 'Visa',
    master: 'Mastercard',
    masterdebit: 'Mastercard',
    debmaster: 'Mastercard',
    amex: 'American Express',
    naranja: 'Naranja',
    cabal: 'Cabal',
    debcabal: 'Cabal',
    maestro: 'Maestro',
    elo: 'Elo',
    diners: 'Diners Club',
    argencard: 'Argencard',
    cmr: 'CMR',
    cencosud: 'Cencosud',
    tarshop: 'Tarjeta Shopping',
    account_money: 'Mercado Pago',
  };
  if (known[key]) {
    return known[key];
  }
  return key
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatMaskedCard(
  brand: string | null | undefined,
  last4: string | null | undefined
): string | null {
  const digits = (last4 ?? '').replace(/\D/g, '').slice(-4);
  if (!digits) {
    return null;
  }
  const name = brand?.trim() ? cardBrandLabel(brand) : '';
  return name ? `${name} •••• ${digits}` : `•••• ${digits}`;
}

function formatShippingAddress(
  addr: PurchaseShippingAddress | null | undefined
): { value: string; subvalue?: string } | null {
  if (!addr) {
    return null;
  }
  const name = addr.full_name?.trim() || '';
  const street = [addr.address_line1, addr.city]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
  const rest = [addr.state, addr.postal_code, addr.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
  const loc = [street, rest].filter(Boolean).join('\n');
  if (name && loc) {
    return { value: name, subvalue: loc };
  }
  if (name) {
    return { value: name };
  }
  if (loc) {
    return { value: street || rest, subvalue: street && rest ? rest : undefined };
  }
  return null;
}

export interface PurchaseDetailScreenProps {
  /**
   * Valor inicial, tal como lo trajo la lista de Actividad o un push. La pantalla
   * vuelve a pedir la venta por su uuid y trabaja con esa respuesta.
   */
  purchase: PurchaseItem;
  onBack: () => void;
  onOpenSellerProfile?: (sellerUserId: string) => void;
  /** Inicia (o retoma) el chat con la contraparte: vendedor en compras, comprador en ventas. */
  onStartChat?: (peerUserId: string) => void;
  /** Tab de Actividad de origen. `sales` no pide el desglose (endpoint de comprador). */
  activityRole?: 'purchases' | 'sales';
}

export const PurchaseDetailScreen: React.FC<PurchaseDetailScreenProps> = ({
  purchase: initialPurchase,
  onBack,
  onOpenSellerProfile,
  onStartChat,
  activityRole,
}) => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  /**
   * Fuente de verdad de la pantalla. La prop viene del objeto que cargó la lista de
   * Actividad y puede tener horas: el cron avanza el envío sin que esa lista se
   * entere, y el timeline quedaba en un paso viejo junto a eventos frescos.
   */
  const [purchase, setPurchase] = useState<PurchaseItem>(initialPurchase);
  const sellerId = purchase.counterpart.user_id;

  // Overrides oscuros; en claro todos son `null` y mandan los estilos estáticos.
  const darkText = isDark ? { color: D.text } : null;
  const darkMuted = isDark ? { color: D.textSecondary } : null;
  const darkCard = isDark ? { backgroundColor: D.surface } : null;
  const darkRow = isDark ? { backgroundColor: D.surfaceAlt } : null;
  const darkHairline = isDark ? { borderColor: D.borderSubtle } : null;

  const [sellerProfile, setSellerProfile] = useState<UserPublicProfile | null>(null);
  const [similarProducts, setSimilarProducts] = useState<UserProfileProductItem[]>([]);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewSending, setReviewSending] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);
  const [reviewImageUris, setReviewImageUris] = useState<string[]>([]);
  const [clipPaused, setClipPaused] = useState(true);
  const [clipDuration, setClipDuration] = useState<number | null>(null);
  const [clipError, setClipError] = useState(false);
  const [clipViewerOpen, setClipViewerOpen] = useState(false);
  /** Checkout de MP pendiente: aparece cuando el cobro automático no pudo hacerse. */
  const [pendingCheckoutUrl, setPendingCheckoutUrl] = useState<string | null>(null);
  /** Historial del envío; null mientras carga o si la venta no tiene envío. */
  const [tracking, setTracking] = useState<PurchaseTracking | null>(null);
  const [paymentDetail, setPaymentDetail] = useState<PurchasePaymentDetail | null>(null);
  const [contactVisible, setContactVisible] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);

  const sellerName =
    sellerProfile?.display_name?.trim() ||
    purchase.counterpart.name?.trim() ||
    t('activity.unknownUser');

  const bioText = sellerProfile?.bio?.trim() ?? '';
  const bioOverflows = graphemeCount(bioText) > BIO_PREVIEW_MAX_GRAPHEMES;
  const displayedBio =
    bioExpanded || !bioOverflows
      ? bioText
      : sliceGraphemes(bioText, BIO_PREVIEW_MAX_GRAPHEMES);

  const {
    isFollowing,
    followLoading,
    toggleFollow,
  } = useSellerFollow({
    sellerUserId: sellerId,
    sellerName,
    initialFollowing: sellerProfile?.is_following ?? false,
  });
  const { isSubscribed, toggleSubscription } = useSellerNotifications({
    sellerUserId: sellerId,
    enabled: true,
  });

  useEffect(() => {
    setBioExpanded(false);
  }, [bioText]);

  /**
   * Se vuelve a pedir la venta por su uuid al montar (la pantalla se desmonta al
   * salir, así que cada entrada la refresca) y cuando cambia la prop (un push a
   * otra compra con el detalle ya abierto). Mientras carga se muestra la prop, para
   * no parpadear. Si falla, queda la prop: un detalle que no abre por un problema
   * de red es peor que un estado viejo.
   */
  useEffect(() => {
    let cancelled = false;
    setPurchase(initialPurchase);
    void (async () => {
      try {
        const token = await storage.getAccessToken();
        if (!token) return;
        const fresh = await getMyPurchase(token, initialPurchase.sale_uuid);
        if (!cancelled) setPurchase(fresh);
      } catch {
        // Sin red (o venta ya no visible): se sigue mostrando lo que trajo la lista.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialPurchase]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = await storage.getAccessToken();
        if (!token) return;
        const [profile, products] = await Promise.all([
          getUserPublicProfile(sellerId, token).catch(() => null),
          getUserProfileProducts(token, sellerId, { limit: 8 }).catch(
            () => [] as UserProfileProductItem[]
          ),
        ]);
        if (cancelled) return;
        if (profile) setSellerProfile(profile);
        setSimilarProducts(
          products
            .filter((p) => {
              const id = p.product_id || p.room_uuid;
              return String(id) !== String(purchase.product_id);
            })
            .slice(0, 3)
        );
      } catch {
        // Información complementaria: no bloquea el detalle.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sellerId, purchase.product_id]);

  /**
   * Historial del envío: cada paso con su fecha. No se denormaliza en la compra,
   * así que el detalle lo pide aparte. Sin envío el backend responde
   * `has_shipment: false` y el timeline se arma solo con lo que trae la venta.
   */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = await storage.getAccessToken();
        if (!token) return;
        const data = await getMyPurchaseTracking(token, purchase.sale_uuid);
        if (!cancelled) setTracking(data);
      } catch {
        // El timeline funciona sin el historial: solo pierde las fechas.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [purchase.sale_uuid]);

  /**
   * Desglose de pago (método enmascarado, IVA, dirección, comprobante). Si falla,
   * el bloque sigue mostrando lo que ya trae el prop `purchase`. El vendedor no
   * llama: el endpoint es de comprador (404) y el bloque ya se arma del prop.
   */
  useEffect(() => {
    let cancelled = false;
    if (activityRole === 'sales') {
      setPaymentDetail(null);
      return;
    }
    void (async () => {
      try {
        const token = await storage.getAccessToken();
        if (!token) return;
        const data = await getMyPurchasePayment(token, purchase.sale_uuid);
        if (!cancelled) setPaymentDetail(data);
      } catch {
        // Sin desglose: ID de orden, subtotal, envío y total salen del prop.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [purchase.sale_uuid, activityRole]);

  /**
   * Si el cobro automático no salió, el saga deja el intent en REQUIRES_CLIENT_ACTION
   * con un checkout de Mercado Pago para pagar a mano
   * (docs/plan-cobro-tarjeta-y-wallet.md, fase 2).
   */
  useEffect(() => {
    let cancelled = false;
    if (purchase.payment_status === 'paid' || purchase.payment_status === 'cancelled') {
      setPendingCheckoutUrl(null);
      return;
    }
    void (async () => {
      try {
        const [intent, config] = await Promise.all([
          getPaymentIntentBySaleUuid(purchase.sale_uuid),
          getPublicPaymentsConfig().catch(() => null),
        ]);
        if (cancelled) return;
        if (intent?.status !== 'REQUIRES_CLIENT_ACTION') {
          setPendingCheckoutUrl(null);
          return;
        }
        // Con credenciales TEST el init_point productivo no sirve: hay que mandar al
        // checkout de sandbox. Misma resolución que la vinculación de MP.
        setPendingCheckoutUrl(
          resolveMpWalletCheckoutUrl({
            preference_id: intent.wallet_preference_id ?? undefined,
            init_point: intent.wallet_init_point,
            sandbox_init_point: intent.wallet_sandbox_init_point,
            environment_hint: config?.environment_hint,
            public_key: config?.public_key,
          })
        );
      } catch {
        // El bloque de pago simplemente no se muestra.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [purchase.sale_uuid, purchase.payment_status]);

  const openCheckout = async () => {
    if (!pendingCheckoutUrl) return;
    try {
      await Linking.openURL(pendingCheckoutUrl);
    } catch {
      appAlert(t('common.appName'), t('activity.paymentCheckoutError'));
    }
  };

  const copyToClipboard = (value: string, title: string) => {
    // Si el sistema niega la copia, se muestra el número para transcribirlo a mano.
    appAlert(title, writeClipboardText(value) ? t('common.copied') : value);
  };

  const submitReview = async () => {
    if (reviewRating < 1 || reviewSending) return;
    setReviewSending(true);
    try {
      let uploaded: string[] = [];
      if (reviewImageUris.length > 0) {
        uploaded = await uploadReviewImages(
          reviewImageUris.map((uri, index) => photoFromUri(uri, `review-${index}.jpg`))
        );
      }
      // El formulario captura una sola calificación: envío y producto quedan sin
      // dato a propósito para no inflar esos promedios con un valor no calificado.
      await createUserReview(sellerId, {
        rating_general: reviewRating,
        comment: reviewMessage.trim() || null,
        product_label: purchase.product_title,
        product_image_url: uploaded[0] ?? purchase.product_image_url ?? null,
        product_image_urls: uploaded.length > 0 ? uploaded : undefined,
      });
      setReviewSent(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error');
      appAlert(t('common.appName'), msg);
    } finally {
      setReviewSending(false);
    }
  };

  const pickReviewImages = () => {
    if (reviewSending || reviewImageUris.length >= MAX_REVIEW_IMAGES) {
      return;
    }
    deferMediaPicker(() => {
      launchPhotoLibraryNow(
        { mediaType: 'photo', selectionLimit: MAX_REVIEW_IMAGES - reviewImageUris.length },
        (response) => {
          const uris =
            response.assets
              ?.map((asset) => asset.uri)
              .filter((uri): uri is string => Boolean(uri)) ?? [];
          if (uris.length === 0) {
            return;
          }
          setReviewImageUris((prev) => [...prev, ...uris].slice(0, MAX_REVIEW_IMAGES));
        },
      );
    });
  };

  const removeReviewImage = (uri: string) => {
    setReviewImageUris((prev) => prev.filter((item) => item !== uri));
  };

  const locale = i18n.language || 'es';
  const isPaid = purchase.payment_status === 'paid';
  /** El cobro venció sin completarse: la operación quedó sin efecto y no hay envío. */
  const isCancelled = purchase.payment_status === 'cancelled';
  const fulfillmentStatus = normalizeFulfillmentStatus(purchase.fulfillment_status);
  const shipmentFailed = isFulfillmentFailure(fulfillmentStatus);
  // Índice en la línea de avance: 1 = guía creada, 2 = en tránsito, 4 = entregado.
  const progress = fulfillmentProgress(fulfillmentStatus);

  /** Fecha (epoch s) del primer evento del envío con uno de esos estados. */
  const eventDateFor = (codes: string[]): number | undefined => {
    const event = tracking?.events?.find(
      (e) => e.state_code && codes.includes(e.state_code.toUpperCase()) && e.occurred_at
    );
    return event?.occurred_at ?? undefined;
  };

  const shippedAt = eventDateFor(['CREATED', 'PICKING']);
  const inTransitAt = eventDateFor(['IN_TRANSIT', 'OUT_FOR_DELIVERY']);
  const deliveredAt =
    purchase.delivered_at ?? tracking?.delivered_at ?? eventDateFor(['DELIVERED']);
  const estimatedAt = tracking?.estimated_delivery_at ?? purchase.estimated_delivery_at;
  const paidAt = purchase.paid_at ?? paymentDetail?.paid_at ?? null;
  const guideId = (tracking?.guide_id ?? purchase.delivery_guide_id)?.trim() || null;

  const stepDate = (epochSec?: number | null): string | undefined =>
    epochSec ? formatDateTime(epochSec, locale) : undefined;

  /**
   * Pasos de envío cumplidos: 1 = guía creada, 2 = en camino, 3 = entregado.
   * `failed_delivery` y `returned` implican que el paquete viajó, así que los dos
   * primeros quedan cumplidos y el fallo reemplaza al último paso.
   */
  const shippingReached = shipmentFailed
    ? fulfillmentStatus === 'shipment_failed'
      ? 0
      : 2
    : progress >= 4
      ? 3
      : progress >= 2
        ? 2
        : progress >= 1
          ? 1
          : 0;

  const stepState = (index: number): 'done' | 'current' | 'todo' => {
    if (shippingReached >= index) return 'done';
    if (shipmentFailed || !isPaid) return 'todo';
    // El paso siguiente al último cumplido es el que está en curso.
    return shippingReached === index - 1 ? 'current' : 'todo';
  };

  type TimelineStep = {
    label: string;
    sub?: string;
    state: 'done' | 'current' | 'todo' | 'failed';
  };

  const confirmedStep: TimelineStep = {
    label: t('activity.stepConfirmed'),
    sub: formatDateTime(purchase.created_at, locale),
    state: 'done',
  };
  const paymentStep: TimelineStep = {
    label: t('activity.stepPaymentApproved'),
    state: isPaid ? 'done' : 'current',
    sub: isPaid ? stepDate(paidAt) : t('activity.stepPaymentPendingHint'),
  };

  /**
   * Timeline real: los tres últimos pasos salen de `fulfillment_status`, no del
   * pago. Un envío fallido reemplaza el paso donde se cortó por uno en rojo — un
   * timeline de 5 pasos verdes no puede representar un envío que no llegó.
   *
   * Cancelada (el cobro venció sin completarse): se muestran los pasos que sí
   * pasaron y la cancelación en rojo, sin pasos de envío — ese envío no va a
   * existir, y dejarlos en gris la hacía parecer una compra en curso.
   */
  const timelineSteps: TimelineStep[] = isCancelled
    ? [
        confirmedStep,
        ...(paidAt ? [{ ...paymentStep, state: 'done' as const }] : []),
        {
          label: t('activity.stepCancelled'),
          state: 'failed',
          sub: t('activity.stepCancelledHint'),
        },
      ]
    : [
        confirmedStep,
        paymentStep,
        fulfillmentStatus === 'shipment_failed'
          ? {
              label: t('activity.stepShipmentFailed'),
              state: 'failed',
              sub: t('activity.stepShipmentFailedHint'),
            }
          : {
              label: t('activity.stepPreparing'),
              state: stepState(1),
              sub:
                stepDate(shippedAt) ??
                (stepState(1) === 'current' ? t('activity.stepPreparingHint') : undefined),
            },
        {
          label: t('activity.stepOnTheWay'),
          state: stepState(2),
          sub: stepDate(inTransitAt),
        },
        fulfillmentStatus === 'failed_delivery'
          ? {
              label: t('activity.stepFailedDelivery'),
              state: 'failed',
              sub: t('activity.stepFailedDeliveryHint'),
            }
          : fulfillmentStatus === 'returned'
            ? {
                label: t('activity.stepReturned'),
                state: 'failed',
                sub: t('activity.stepReturnedHint'),
              }
            : {
                label: t('activity.stepDelivered'),
                state: stepState(3),
                sub: stepDate(deliveredAt),
              },
      ];

  const conditionLabel =
    purchase.condition === 'new'
      ? t('activity.conditionNew')
      : purchase.condition === 'lightly_used'
        ? t('activity.conditionLightlyUsed')
        : purchase.condition === 'used'
          ? t('activity.conditionUsed')
          : '—';

  const productPriceLabel = formatStreamPrice(
    Math.round(purchase.amount_cents / 100),
    purchase.currency
  );
  // Ventas viejas o aún sin cotizar: sin desglose, el total es el producto solo.
  const shippingCents = purchase.shipping_cost_cents;
  // "Total pagado" es lo que MP cobró de verdad cuando se sabe; la suma calculada
  // solo mientras el cobro no está aprobado.
  const totalLabel = formatStreamPrice(
    Math.round(
      (paymentDetail?.charged_cents ?? purchase.total_cents ?? purchase.amount_cents) / 100
    ),
    purchase.currency
  );
  const shippingLabel =
    shippingCents == null
      ? null
      : shippingCents === 0
        ? t('activity.shippingFree')
        : formatStreamPrice(Math.round(shippingCents / 100), purchase.currency);

  const orderNumberLabel = `#${purchase.order_number}`;
  const maskedCard = formatMaskedCard(paymentDetail?.card_brand, paymentDetail?.card_last4);
  const paymentMethodLabel = paymentDetail
    ? maskedCard ?? t('activity.paymentMercadoPago')
    : null;
  const approvedEpoch = paymentDetail?.approved_at || paymentDetail?.paid_at || null;
  const shippingAddressFmt = formatShippingAddress(paymentDetail?.shipping_address ?? null);
  const taxCents = paymentDetail?.tax_cents;
  const taxRateBp = paymentDetail?.tax_rate_bp;
  const showTax = taxCents != null && taxCents > 0;
  const taxLabel =
    taxRateBp != null && taxRateBp > 0
      ? t('activity.paymentTaxIncluded', { percent: Math.round(taxRateBp / 100) })
      : t('activity.paymentTaxIncludedNoRate');
  const taxAmountLabel = showTax
    ? formatStreamPrice(Math.round((taxCents as number) / 100), purchase.currency)
    : null;
  const receiptId = paymentDetail?.provider_payment_id?.trim() || null;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top ? 8 : 16 }]}>
        <TouchableOpacity onPress={onBack} hitSlop={12} accessibilityRole="button">
          <IconChevronLeft size={24} color={isDark ? D.text : TEXT} />
        </TouchableOpacity>
        <RNText style={[styles.headerTitle, darkText]}>{t('activity.detailTitle')}</RNText>
        <TouchableOpacity
          onPress={() => {
            // Sin precio: es información que el usuario puede no querer publicar.
            const product = purchase.product_title;
            void (async () => {
              try {
                // Android solo acepta texto; en iOS el `url` viaja aparte (habilita
                // Guardar / Abrir enlace), así que se interpola vacío para no duplicarlo.
                if (Platform.OS === 'ios') {
                  const message = t('activity.sharePurchase', { product, url: '' }).trimEnd();
                  await Share.share({ message, url: APP_DOWNLOAD_URL });
                } else {
                  await Share.share({
                    message: t('activity.sharePurchase', { product, url: APP_DOWNLOAD_URL }),
                  });
                }
              } catch {
                // Cancelar la hoja de compartir no es un error.
              }
            })();
          }}
          hitSlop={12}
        >
          <IconShare size={22} color={PRIMARY} />
        </TouchableOpacity>
      </View>

      <KeyboardDismissScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* Pago pendiente: el cobro automático falló y hay checkout de MP disponible. */}
        {pendingCheckoutUrl ? (
          <View style={[styles.payBanner, darkCard]}>
            <RNText style={[styles.payBannerTitle, darkText]}>
              {t('activity.paymentPendingTitle')}
            </RNText>
            <RNText style={[styles.payBannerBody, darkMuted]}>
              {t('activity.paymentPendingBody')}
            </RNText>
            <TouchableOpacity
              style={styles.payBannerBtn}
              onPress={() => {
                void openCheckout();
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <RNText style={styles.payBannerBtnText}>{t('activity.paymentPendingCta')}</RNText>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Resumen del producto */}
        <View style={[styles.summaryRow, darkHairline]}>
          {purchase.product_image_url ? (
            <Image
              source={{ uri: purchase.product_image_url }}
              style={[styles.summaryImage, darkRow]}
            />
          ) : (
            <View style={[styles.summaryImage, styles.summaryImageFallback, darkRow]} />
          )}
          <View style={styles.summaryBody}>
            <RNText style={[styles.summaryTitle, darkText]}>{purchase.product_title}</RNText>
            <TouchableOpacity
              style={styles.sellerChip}
              onPress={() => onOpenSellerProfile?.(sellerId)}
              activeOpacity={0.8}
            >
              {purchase.counterpart.profile_picture ? (
                <Image
                  source={{ uri: purchase.counterpart.profile_picture }}
                  style={styles.sellerChipAvatar}
                />
              ) : (
                <View style={[styles.sellerChipAvatar, styles.sellerChipFallback, darkRow]} />
              )}
              <RNText style={styles.sellerChipText}>{sellerName}</RNText>
            </TouchableOpacity>
            <View style={styles.wonRow}>
              <RNText style={[styles.wonText, darkText]}>🏆 {t('activity.wonAuction')}</RNText>
              <RNText style={styles.wonPrice}>{productPriceLabel}</RNText>
            </View>
          </View>
        </View>

        {/* Detalles de la compra */}
        <View style={[styles.card, darkCard]}>
          <RNText style={[styles.cardTitle, darkText]}>{t('activity.purchaseDetails')}</RNText>
          <DetailRow
            label={t('activity.orderNumber')}
            value={`#${purchase.order_number}`}
            valueColor={PRIMARY}
            onCopy={() => copyToClipboard(purchase.order_number, t('activity.orderNumber'))}
          />
          {purchase.sku ? <DetailRow label="SKU" value={purchase.sku} /> : null}
          <DetailRow
            label={t('activity.dateTime')}
            value={formatDateTime(purchase.created_at, i18n.language || 'es')}
          />
          {purchase.category_name ? (
            <DetailRow label={t('activity.category')} value={purchase.category_name} />
          ) : null}
          <DetailRow label={t('activity.quantity')} value={String(purchase.quantity)} />
          <DetailRow label={t('activity.condition')} value={conditionLabel} />
        </View>

        {/* Clip de la Compra: video de la subasta (grabado por platform_livestream). */}
        {purchase.recording_asset_url && !clipError ? (
          <View style={[styles.card, darkCard]}>
            <RNText style={[styles.cardTitle, darkText]}>{t('activity.clipTitle')}</RNText>
            <View style={styles.clipVideoWrap}>
              {/* Tocar el video (fuera del botón) abre el visor fullscreen. */}
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={0.9}
                onPress={() => {
                  setClipPaused(true); // evita audio doble con el visor
                  setClipViewerOpen(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('activity.clipTitle')}
              >
                <Video
                  source={{ uri: purchase.recording_asset_url }}
                  style={styles.clipVideo}
                  paused={clipPaused}
                  resizeMode="cover"
                  poster={purchase.product_image_url ?? undefined}
                  posterResizeMode="cover"
                  onLoad={(data) => setClipDuration(data.duration)}
                  onEnd={() => setClipPaused(true)}
                  onError={() => setClipError(true)}
                  ignoreSilentSwitch="ignore"
                />
              </TouchableOpacity>
              {purchase.category_name ? (
                <View style={styles.clipCategoryChip} pointerEvents="none">
                  <RNText style={styles.clipCategoryText}>{purchase.category_name}</RNText>
                </View>
              ) : null}
              {/* Botón play/pausa: control propio, por encima del video. */}
              <View style={styles.clipPlayOverlay} pointerEvents="box-none">
                <TouchableOpacity
                  style={[styles.clipPlayCircle, clipPaused && styles.clipPlayCircleIdle]}
                  activeOpacity={0.85}
                  onPress={() => setClipPaused((p) => !p)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    clipPaused ? t('activity.clipPlay') : t('activity.clipPause')
                  }
                >
                  {clipPaused ? (
                    <Play size={30} color="#FFFFFF" fill="#FFFFFF" strokeWidth={1} />
                  ) : (
                    <Pause size={26} color="#FFFFFF" fill="#FFFFFF" strokeWidth={1} />
                  )}
                </TouchableOpacity>
              </View>
              {clipDuration != null && clipDuration > 0 ? (
                <View style={styles.clipDurationBadge} pointerEvents="none">
                  <RNText style={styles.clipDurationText}>
                    {formatClipDuration(clipDuration)}
                  </RNText>
                </View>
              ) : null}
            </View>
            <View style={styles.clipInfoRow}>
              <View style={styles.clipInfoIcon}>
                <VideoIcon size={20} color={PRIMARY} strokeWidth={1.75} />
              </View>
              <View style={styles.clipInfoTextCol}>
                <RNText style={[styles.clipInfoTitle, darkText]} numberOfLines={1}>
                  {sellerName} · {t('activity.clipOf', { title: purchase.product_title })}
                </RNText>
                <RNText style={[styles.clipInfoSub, darkMuted]}>
                  {t('activity.clipSubtitle')}
                </RNText>
                {purchase.won_at_ms ? (
                  <RNText style={[styles.clipInfoSub, darkMuted]}>
                    {formatDateTime(Math.round(purchase.won_at_ms / 1000), i18n.language || 'es')}
                  </RNText>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        {/* Estado del Envío */}
        <View style={[styles.card, darkCard]}>
          <View style={styles.shippingHeaderRow}>
            <View style={styles.shippingTitleRow}>
              <RNText style={[styles.cardTitle, darkText]}>{t('activity.shippingStatus')}</RNText>
              {tracking?.carrier_name ? (
                <RNText style={[styles.shippingCarrier, darkMuted]} numberOfLines={1}>
                  {tracking.carrier_name}
                </RNText>
              ) : null}
              {tracking?.carrier_tracking_url ? (
                <TouchableOpacity
                  onPress={() => {
                    void Linking.openURL(tracking.carrier_tracking_url as string);
                  }}
                  hitSlop={8}
                  accessibilityRole="link"
                  accessibilityLabel={t('activity.shippingStatus')}
                >
                  <ExternalLink size={24} color={PRIMARY} strokeWidth={1.75} />
                </TouchableOpacity>
              ) : null}
            </View>
            {/* Sin fecha de entrega el Figma no tiene estado vacío: se omite. */}
            {estimatedAt && !shipmentFailed && shippingReached < 3 ? (
              <RNText style={[styles.shippingEta, darkMuted]}>
                {t('activity.estimatedShort', { date: formatDayMonth(estimatedAt, locale) })}
              </RNText>
            ) : null}
          </View>

          {/* El Figma no contempla envíos fallidos: se avisa explícito arriba del
              timeline, que además marca en rojo el paso donde se cortó. */}
          {shipmentFailed ? (
            <View style={styles.shippingAlert}>
              <RNText style={styles.shippingAlertTitle}>
                {fulfillmentStatus === 'failed_delivery'
                  ? t('activity.shippingFailedTitle')
                  : fulfillmentStatus === 'returned'
                    ? t('activity.shippingReturnedTitle')
                    : t('activity.shippingNotCreatedTitle')}
              </RNText>
              <RNText style={[styles.shippingAlertBody, darkMuted]}>
                {fulfillmentStatus === 'failed_delivery'
                  ? t('activity.shippingFailedBody')
                  : fulfillmentStatus === 'returned'
                    ? t('activity.shippingReturnedBody')
                    : t('activity.shippingNotCreatedBody')}
              </RNText>
            </View>
          ) : null}

          {/* N° de seguimiento del transportista (Figma: card con botón copiar). */}
          {guideId ? (
            <View style={[styles.trackingCard, darkRow]}>
              <View style={styles.trackingTextCol}>
                <RNText style={[styles.trackingLabel, darkMuted]}>
                  {t('activity.trackingNumber')}
                </RNText>
                <RNText style={[styles.trackingValue, darkText]} numberOfLines={1}>
                  #{guideId}
                </RNText>
              </View>
              <TouchableOpacity
                onPress={() => copyToClipboard(guideId, t('activity.trackingNumber'))}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('activity.trackingNumber')}
              >
                <Copy size={18} color={PRIMARY} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.timeline}>
            {timelineSteps.map((step, idx) => (
              <View key={step.label} style={styles.timelineStep}>
                <View style={styles.timelineRail}>
                  <View
                    style={[
                      styles.timelineDot,
                      step.state === 'todo' && darkRow,
                      step.state === 'done' && styles.timelineDotDone,
                      step.state === 'current' && styles.timelineDotCurrent,
                      step.state === 'failed' && styles.timelineDotFailed,
                    ]}
                  >
                    {step.state === 'done' ? (
                      <RNText style={styles.timelineCheck}>✓</RNText>
                    ) : step.state === 'failed' ? (
                      <RNText style={styles.timelineCheck}>!</RNText>
                    ) : step.state === 'current' ? (
                      <View style={styles.timelineInnerDot} />
                    ) : null}
                  </View>
                  {idx < timelineSteps.length - 1 ? (
                    <View
                      style={[
                        styles.timelineLine,
                        step.state !== 'done' && darkRow,
                        step.state === 'done' && styles.timelineLineDone,
                      ]}
                    />
                  ) : null}
                </View>
                <View style={styles.timelineTextCol}>
                  <RNText
                    style={[
                      styles.timelineLabel,
                      step.state !== 'todo' && darkText,
                      step.state === 'todo' && styles.timelineLabelTodo,
                      step.state === 'todo' && isDark ? { color: D.textMuted } : null,
                      step.state === 'failed' && styles.timelineLabelFailed,
                    ]}
                  >
                    {step.label}
                  </RNText>
                  {step.sub ? (
                    <RNText style={[styles.timelineSub, darkMuted]}>{step.sub}</RNText>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Detalle de Pago */}
        <View style={[styles.card, darkCard]}>
          <RNText style={[styles.cardTitle, darkText]}>{t('activity.paymentDetail')}</RNText>
          <DetailRow label={t('activity.orderId')} value={orderNumberLabel} />
          {paymentMethodLabel ? (
            <DetailRow
              label={t('activity.paymentMethod')}
              value={paymentMethodLabel}
              subvalue={
                approvedEpoch
                  ? t('activity.paymentApprovedOn', {
                      date: formatDateTime(approvedEpoch, locale),
                    })
                  : undefined
              }
            />
          ) : null}
          {shippingAddressFmt ? (
            <DetailRow
              label={t('activity.shippingAddress')}
              value={shippingAddressFmt.value}
              subvalue={shippingAddressFmt.subvalue}
            />
          ) : null}
          <DetailRow label={t('activity.paymentSubtotal')} value={productPriceLabel} />
          {shippingLabel != null ? (
            <DetailRow label={t('activity.paymentShipping')} value={shippingLabel} />
          ) : null}
          {showTax && taxAmountLabel ? (
            <DetailRow label={taxLabel} value={taxAmountLabel} />
          ) : null}
          <View style={[styles.totalRow, darkHairline]}>
            <RNText style={[styles.totalLabel, darkText]}>{t('activity.totalPaid')}</RNText>
            <RNText style={[styles.totalValue, darkText]}>{totalLabel}</RNText>
          </View>
          {receiptId ? (
            <DetailRow
              label={t('activity.paymentReceipt')}
              value={receiptId}
              onCopy={() => copyToClipboard(receiptId, t('activity.paymentReceipt'))}
            />
          ) : null}
        </View>

        {/* Información del vendedor */}
        <View style={[styles.card, darkCard]}>
          <RNText style={[styles.cardTitle, darkText]}>{t('activity.sellerInfo')}</RNText>
          <View style={styles.sellerHeaderRow}>
            <TouchableOpacity
              style={styles.sellerIdentity}
              onPress={() => onOpenSellerProfile?.(sellerId)}
              activeOpacity={0.8}
            >
              {purchase.counterpart.profile_picture ? (
                <Image
                  source={{ uri: purchase.counterpart.profile_picture }}
                  style={styles.sellerAvatar}
                />
              ) : (
                <View style={[styles.sellerAvatar, styles.sellerChipFallback, darkRow]} />
              )}
              <View style={styles.sellerNameCol}>
                <RNText style={[styles.sellerName, darkText]}>{sellerName}</RNText>
                {isHandle(sellerProfile?.username) ? (
                  <RNText style={[styles.sellerSubtitle, darkMuted]} numberOfLines={1}>
                    @{sellerProfile?.username}
                  </RNText>
                ) : null}
                {sellerProfile?.subtitle ? (
                  <RNText style={[styles.sellerSubtitle, darkMuted]} numberOfLines={1}>
                    {sellerProfile.subtitle}
                  </RNText>
                ) : null}
                {sellerProfile ? (
                  <RNText style={[styles.sellerFollowers, darkMuted]} numberOfLines={1}>
                    {formatCompactCount(sellerProfile.followers_count)} {t('profile.followers')}
                    {' · '}
                    {formatCompactCount(sellerProfile.following_count)} {t('profile.following')}
                  </RNText>
                ) : null}
              </View>
            </TouchableOpacity>
            <View style={styles.sellerActions}>
              <TouchableOpacity
                style={[
                  styles.sellerActionBtn,
                  darkRow,
                  isSubscribed && styles.sellerActionBtnActive,
                ]}
                onPress={() => {
                  void toggleSubscription();
                }}
              >
                <IconBell size={20} color={isSubscribed ? '#FFFFFF' : PRIMARY} strokeWidth={1.75} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sellerActionBtn, darkRow]}
                onPress={() =>
                  onStartChat
                    ? onStartChat(sellerId)
                    : appAlert(t('common.appName'), t('home.placeholderScreen'))
                }
                accessibilityRole="button"
                accessibilityLabel={t('profile.messageSeller')}
              >
                <IconChat size={20} color={PRIMARY} strokeWidth={1.75} />
              </TouchableOpacity>
            </View>
          </View>

          {sellerProfile ? (
            <View style={styles.sellerStatsRow}>
              <View style={[styles.sellerStatCard, darkRow]}>
                <Star size={16} color={PRIMARY} strokeWidth={2} />
                <RNText style={[styles.sellerStatValue, darkText]}>
                  {sellerProfile.reviews_avg ?? '—'}
                </RNText>
                <RNText style={[styles.sellerStatLabel, darkMuted]}>
                  {formatCompactCount(sellerProfile.reviews_count ?? 0)}{' '}
                  {t('profile.reviewsLabel')}
                </RNText>
              </View>
              <View style={[styles.sellerStatCard, darkRow]}>
                <Tag size={16} color={PRIMARY} strokeWidth={2} />
                <RNText style={[styles.sellerStatValue, darkText]}>
                  {formatCompactCount(sellerProfile.sold_count ?? 0)}
                </RNText>
                <RNText style={[styles.sellerStatLabel, darkMuted]}>{t('profile.sold')}</RNText>
              </View>
            </View>
          ) : null}

          {bioText ? (
            <View style={styles.sellerBioBlock}>
              <RNText style={[styles.sellerBioText, darkMuted]}>{displayedBio}</RNText>
              {bioOverflows ? (
                <TouchableOpacity onPress={() => setBioExpanded((v) => !v)}>
                  <RNText style={styles.sellerBioMore}>
                    {bioExpanded ? t('profile.seeLess') : t('profile.seeMore')}
                  </RNText>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.followBtn,
              isFollowing && styles.followBtnFollowing,
              isFollowing ? darkRow : null,
            ]}
            onPress={() => {
              void toggleFollow();
            }}
            disabled={followLoading}
            activeOpacity={0.85}
          >
            {followLoading ? (
              <ActivityIndicator
                color={isFollowing ? (isDark ? D.textSecondary : MUTED) : '#FFFFFF'}
                size="small"
              />
            ) : (
              <RNText
                style={[
                  styles.followBtnText,
                  isFollowing && styles.followBtnTextFollowing,
                  isFollowing ? darkMuted : null,
                ]}
              >
                {isFollowing ? t('stream.following') : t('stream.follow')}
              </RNText>
            )}
          </TouchableOpacity>
        </View>

        {/* Cuéntanos tu opinión */}
        <View style={[styles.card, darkCard]}>
          <View style={styles.reviewHeaderRow}>
            <RNText style={[styles.cardTitle, darkText]}>{t('activity.reviewTitle')}</RNText>
            <TouchableOpacity onPress={() => onOpenSellerProfile?.(sellerId)}>
              <RNText style={styles.reviewSeeAll}>{t('activity.seeReviews')}</RNText>
            </TouchableOpacity>
          </View>
          {reviewSent ? (
            <RNText style={styles.reviewThanks}>{t('activity.reviewThanks')}</RNText>
          ) : (
            <>
              <View style={[styles.reviewStarsWrap, darkRow]}>
                <StarRatingInput value={reviewRating} onChange={setReviewRating} />
              </View>
              <RNText style={[styles.reviewFieldLabel, darkMuted]}>
                {t('activity.reviewMessage')}
              </RNText>
              <AppTextInput
                style={[styles.reviewInput, darkHairline, darkRow, darkText]}
                value={reviewMessage}
                onChangeText={setReviewMessage}
                placeholder={t('activity.reviewMessagePlaceholder')}
                placeholderTextColor={isDark ? D.textMuted : MUTED}
                multiline
              />
              <RNText style={[styles.reviewFieldLabel, darkMuted]}>
                {t('activity.reviewImages')}
              </RNText>
              <View style={[styles.reviewImagesBox, darkHairline, darkRow]}>
                {reviewImageUris.length === 0 ? (
                  <>
                    <RNText style={[styles.reviewImagesHint, darkMuted]}>
                      {t('activity.reviewImagesHint')}
                    </RNText>
                    <TouchableOpacity
                      onPress={pickReviewImages}
                      activeOpacity={0.85}
                      disabled={reviewSending}
                      hitSlop={12}
                      accessibilityRole="button"
                      accessibilityLabel={t('activity.reviewAddImage')}
                    >
                      <ImageUp
                        size={24}
                        color={isDark ? D.textMuted : MUTED}
                        strokeWidth={2}
                      />
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.reviewImagesPreviewRow}>
                    {reviewImageUris.map((uri) => (
                      <View key={uri} style={styles.reviewImageThumbWrap}>
                        <Image source={{ uri }} style={styles.reviewImageThumb} />
                        <TouchableOpacity
                          style={styles.reviewImageRemove}
                          onPress={() => removeReviewImage(uri)}
                          disabled={reviewSending}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel={t('activity.reviewRemoveImage')}
                        >
                          <X size={12} color="#FFFFFF" strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {reviewImageUris.length < MAX_REVIEW_IMAGES ? (
                      <TouchableOpacity
                        style={[styles.reviewImageAddMore, darkHairline]}
                        onPress={pickReviewImages}
                        activeOpacity={0.85}
                        disabled={reviewSending}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={t('activity.reviewAddImage')}
                      >
                        <ImageUp
                          size={20}
                          color={isDark ? D.textMuted : MUTED}
                          strokeWidth={2}
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.followBtn,
                  (reviewRating < 1 || reviewSending) && styles.sendBtnDisabled,
                ]}
                onPress={() => {
                  void submitReview();
                }}
                disabled={reviewRating < 1 || reviewSending}
                activeOpacity={0.85}
              >
                {reviewSending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <RNText style={styles.followBtnText}>{t('activity.reviewSend')}</RNText>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Productos similares */}
        {similarProducts.length > 0 ? (
          <View style={[styles.card, darkCard]}>
            <View style={styles.reviewHeaderRow}>
              <RNText style={[styles.cardTitle, darkText]}>{t('activity.similarProducts')}</RNText>
              <TouchableOpacity onPress={() => onOpenSellerProfile?.(sellerId)}>
                <RNText style={styles.reviewSeeAll}>{t('activity.seeAll')}</RNText>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.similarRow}
            >
              {similarProducts.map((product) => (
                <TouchableOpacity
                  key={product.room_uuid}
                  style={[styles.similarCard, darkRow]}
                  activeOpacity={0.85}
                  onPress={() => onOpenSellerProfile?.(sellerId)}
                >
                  {product.thumbnail_url ? (
                    <Image
                      source={{ uri: product.thumbnail_url }}
                      style={styles.similarImage}
                    />
                  ) : (
                    <View style={[styles.similarImage, styles.sellerChipFallback, darkRow]} />
                  )}
                  <RNText style={[styles.similarTitle, darkText]} numberOfLines={1}>
                    {product.title}
                  </RNText>
                  <RNText style={[styles.similarSeller, darkMuted]} numberOfLines={1}>
                    {sellerName}
                  </RNText>
                  <RNText style={[styles.similarPrice, darkText]}>
                    {formatStreamPrice(
                      Math.round(product.price_cents / 100),
                      product.currency
                    )}
                  </RNText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Soporte */}
        <View style={[styles.card, darkCard]}>
          <RNText style={[styles.cardTitle, darkText]}>{t('activity.needHelp')}</RNText>
          <TouchableOpacity
            style={styles.followBtn}
            onPress={() => setContactVisible(true)}
            activeOpacity={0.85}
          >
            <RNText style={styles.followBtnText}>{t('activity.contactSupport')}</RNText>
          </TouchableOpacity>
        </View>
      </KeyboardDismissScrollView>

      {/* Visor fullscreen del clip — Figma 698-11133 */}
      {purchase.recording_asset_url ? (
        <PurchaseClipViewer
          visible={clipViewerOpen}
          uri={purchase.recording_asset_url}
          purchase={purchase}
          sellerName={sellerName}
          sellerAvatarUrl={
            sellerProfile?.profile_picture ?? purchase.counterpart.profile_picture
          }
          sellerRating={sellerProfile?.reviews_avg}
          isFollowing={isFollowing}
          followLoading={followLoading}
          onToggleFollow={() => {
            void toggleFollow();
          }}
          onOpenSellerProfile={
            onOpenSellerProfile ? () => onOpenSellerProfile(sellerId) : undefined
          }
          onClose={() => setClipViewerOpen(false)}
        />
      ) : null}

      <ContactModal
        visible={contactVisible}
        onClose={() => setContactVisible(false)}
        initialMessage={t('activity.supportPrefill', { number: purchase.order_number })}
      />
    </View>
  );
};

const DetailRow: React.FC<{
  label: string;
  value: string;
  subvalue?: string;
  valueColor?: string;
  onCopy?: () => void;
}> = ({ label, value, subvalue, valueColor, onCopy }) => {
  const { isDark } = useTheme();
  return (
    <View
      style={[
        styles.detailRow,
        subvalue ? styles.detailRowTop : null,
        isDark ? { backgroundColor: D.surfaceAlt } : null,
      ]}
    >
      <RNText style={[styles.detailLabel, isDark ? { color: D.textSecondary } : null]}>
        {label}
      </RNText>
      <View style={styles.detailValueWrap}>
        <View style={styles.detailValueCol}>
          <RNText
            style={[
              styles.detailValue,
              isDark ? { color: D.text } : null,
              valueColor ? { color: valueColor } : null,
            ]}
          >
            {value}
          </RNText>
          {subvalue ? (
            <RNText style={[styles.detailSubvalue, isDark ? { color: D.textSecondary } : null]}>
              {subvalue}
            </RNText>
          ) : null}
        </View>
        {onCopy ? (
          <TouchableOpacity onPress={onCopy} hitSlop={8}>
            <Copy size={16} color={PRIMARY} strokeWidth={2} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  payBanner: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PRIMARY,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  payBannerTitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: TEXT,
    includeFontPadding: false,
  },
  payBannerBody: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    lineHeight: 18,
    color: MUTED,
    includeFontPadding: false,
  },
  payBannerBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 1000,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  payBannerBtnText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    lineHeight: 24,
    color: TEXT,
    marginLeft: 4,
    includeFontPadding: false,
  },
  content: {
    paddingHorizontal: 16,
    gap: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4E4E7',
    paddingBottom: 20,
  },
  summaryImage: {
    width: 132,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F4F4F5',
  },
  summaryImageFallback: {
    backgroundColor: '#E7E7FF',
  },
  summaryBody: {
    flex: 1,
    minWidth: 0,
    gap: 8,
    justifyContent: 'center',
  },
  summaryTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 18,
    lineHeight: 24,
    color: TEXT,
    includeFontPadding: false,
  },
  sellerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sellerChipAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  sellerChipFallback: {
    backgroundColor: '#E7E7FF',
  },
  sellerChipText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 16,
    color: PRIMARY,
    includeFontPadding: false,
  },
  wonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  wonText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: TEXT,
    includeFontPadding: false,
  },
  wonPrice: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: GOLD,
    includeFontPadding: false,
  },
  card: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: TEXT,
    includeFontPadding: false,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: ROW_BG,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  detailRowTop: {
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    lineHeight: 16,
    color: TEXT,
    includeFontPadding: false,
  },
  detailValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  detailValue: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 13,
    lineHeight: 16,
    color: TEXT,
    includeFontPadding: false,
    textAlign: 'right',
  },
  detailValueCol: {
    flexShrink: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  detailSubvalue: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    lineHeight: 14,
    color: MUTED,
    includeFontPadding: false,
    textAlign: 'right',
  },
  clipVideoWrap: {
    width: '100%',
    height: 224,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#18181B',
  },
  clipVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  clipPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipPlayCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Centrado óptico del triángulo de play. */
  clipPlayCircleIdle: {
    paddingLeft: 4,
  },
  clipDurationBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clipDurationText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  clipCategoryChip: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  clipCategoryText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: '#FDC700',
    includeFontPadding: false,
  },
  clipInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  clipInfoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(104,92,240,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipInfoTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  clipInfoTitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: TEXT,
    includeFontPadding: false,
  },
  clipInfoSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: MUTED,
    includeFontPadding: false,
  },
  shippingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  shippingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  shippingCarrier: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 13,
    lineHeight: 16,
    color: MUTED,
    includeFontPadding: false,
    flexShrink: 1,
  },
  shippingEta: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 13,
    lineHeight: 16,
    color: MUTED,
    includeFontPadding: false,
  },
  shippingAlert: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DANGER,
    backgroundColor: 'rgba(251,44,54,0.08)',
    padding: 12,
    gap: 4,
  },
  shippingAlertTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: DANGER,
    includeFontPadding: false,
  },
  shippingAlertBody: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: MUTED,
    includeFontPadding: false,
  },
  trackingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: ROW_BG,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  trackingTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  trackingLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: MUTED,
    includeFontPadding: false,
  },
  trackingValue: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: TEXT,
    includeFontPadding: false,
  },
  timeline: {
    gap: 0,
  },
  timelineStep: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineRail: {
    alignItems: 'center',
    width: 28,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    backgroundColor: PRIMARY,
  },
  timelineDotCurrent: {
    backgroundColor: PRIMARY,
  },
  timelineDotFailed: {
    backgroundColor: DANGER,
  },
  timelineInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  timelineCheck: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: '#E4E4E7',
  },
  timelineLineDone: {
    backgroundColor: PRIMARY,
  },
  timelineTextCol: {
    flex: 1,
    paddingBottom: 20,
    gap: 2,
  },
  timelineLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: TEXT,
    includeFontPadding: false,
  },
  timelineLabelTodo: {
    color: '#A1A1AA',
    fontFamily: FONT_FAMILY.semibold,
  },
  timelineLabelFailed: {
    color: DANGER,
  },
  timelineSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: MUTED,
    includeFontPadding: false,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4E4E7',
  },
  totalLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    lineHeight: 20,
    color: TEXT,
    includeFontPadding: false,
  },
  totalValue: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 18,
    lineHeight: 24,
    color: TEXT,
    includeFontPadding: false,
  },
  sellerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sellerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  sellerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  sellerNameCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  sellerName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    lineHeight: 20,
    color: TEXT,
    includeFontPadding: false,
  },
  sellerSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: MUTED,
    includeFontPadding: false,
  },
  sellerFollowers: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: MUTED,
    includeFontPadding: false,
  },
  sellerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  sellerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E7E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerActionBtnActive: {
    backgroundColor: PRIMARY,
  },
  sellerStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sellerStatCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ROW_BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  sellerStatValue: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    lineHeight: 20,
    color: TEXT,
    includeFontPadding: false,
  },
  sellerStatLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    lineHeight: 14,
    color: MUTED,
    flexShrink: 1,
    includeFontPadding: false,
  },
  sellerBioBlock: {
    gap: 4,
  },
  sellerBioText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    lineHeight: 18,
    color: MUTED,
    includeFontPadding: false,
  },
  sellerBioMore: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 16,
    color: PRIMARY,
    includeFontPadding: false,
  },
  followBtn: {
    width: '100%',
    minHeight: 44,
    borderRadius: 1000,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtnFollowing: {
    backgroundColor: '#E4E4E7',
  },
  followBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  followBtnTextFollowing: {
    color: '#52525B',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewSeeAll: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    lineHeight: 16,
    color: PRIMARY,
    includeFontPadding: false,
  },
  reviewStarsWrap: {
    backgroundColor: ROW_BG,
    borderRadius: 1000,
    paddingVertical: 14,
  },
  reviewFieldLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: MUTED,
    includeFontPadding: false,
  },
  reviewInput: {
    width: '100%',
    minHeight: 96,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 12,
    padding: 12,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: TEXT,
    textAlignVertical: 'top',
    backgroundColor: '#FFFFFF',
  },
  reviewImagesBox: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    backgroundColor: ROW_BG,
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  reviewImagesHint: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: MUTED,
    textAlign: 'center',
  },
  reviewImagesPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
  },
  reviewImageThumbWrap: {
    width: 72,
    height: 72,
  },
  reviewImageThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  reviewImageRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewImageAddMore: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewThanks: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.success,
    includeFontPadding: false,
  },
  similarRow: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 4,
  },
  similarCard: {
    width: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    paddingBottom: 12,
    gap: 4,
  },
  similarImage: {
    width: '100%',
    aspectRatio: 1.05,
    marginBottom: 6,
  },
  similarTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    lineHeight: 16,
    color: TEXT,
    paddingHorizontal: 10,
    includeFontPadding: false,
  },
  similarSeller: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    lineHeight: 14,
    color: MUTED,
    paddingHorizontal: 10,
    includeFontPadding: false,
  },
  similarPrice: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 18,
    color: TEXT,
    paddingHorizontal: 10,
    includeFontPadding: false,
  },
});
