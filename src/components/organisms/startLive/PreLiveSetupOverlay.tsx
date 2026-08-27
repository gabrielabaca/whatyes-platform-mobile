import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppDatePickerSheet } from '../../molecules/AppDatePickerSheet';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ImagePickerResponse } from 'react-native-image-picker';
import { launchPhotoCameraNow, launchPhotoLibraryNow } from '../../../utils/mediaPicker';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
  View,
  Image,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { AppTextInput, KeyboardAccessoryAppearanceProvider } from '../../atoms/AppTextInput';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  ImagePlus,
  Search,
  UserRound,
  Video,
  X,
} from 'lucide-react-native';
import type { StreamConfig } from './types';
import { uploadRoomCover } from '../../../api/platformApi';
import { ApiError } from '../../../api/authApi';
import { useInterestCategories } from '../../../hooks/useInterestCategories';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { LAYERS } from '../../../theme/layers';
import { ModalWindowBoundary } from '../../../context/OverlayPortalContext';
import { KeyboardDismissScrollView } from '../../atoms/KeyboardDismissScrollView';
import { GlassBackdrop } from '../profile/GlassBackdrop';
import { StreamBottomSheet } from '../stream/StreamBottomSheet';
import { AddProductPhotoSourceDrawer } from '../addProduct/AddProductPhotoSourceDrawer';
import { StartLiveCategoriesDrawer } from './StartLiveCategoriesDrawer';
import { StartLivePrimaryButton } from './StartLivePrimitives';
import { START_LIVE_COLORS, startLivePanelStyle } from './startLiveStyles';
import { appAlert } from '../../../alerts';

type Frequency = NonNullable<StreamConfig['recurrence']>;
type SaleFormat = NonNullable<StreamConfig['saleFormat']>;
type Privacy = NonNullable<StreamConfig['privacy']>;
type Drawer = 'none' | 'frequency' | 'moderators' | 'categories' | 'saleFormat' | 'blockedWords' | 'coverSource';

const preLiveSheetPanelExtra: ViewStyle = {
  paddingTop: 28,
};

const panelStyle: StyleProp<ViewStyle> = [startLivePanelStyle, preLiveSheetPanelExtra];

const { width: LIVE_PRE_LAUNCH_WIDTH, height: LIVE_PRE_LAUNCH_HEIGHT } = Dimensions.get('window');
const LIVE_LAUNCH_CONFETTI_COLORS = [
  themeColors.primary,
  themeColors.danger,
  themeColors.gold,
  themeColors.success,
  themeColors.glass.text,
  START_LIVE_COLORS.border,
];

/** Animación de entrada del overlay: mismos valores que StreamBottomSheet. */
const SHEET_SPRING = { tension: 68, friction: 12 } as const;

function sanitizeWords(words: string[]): string[] {
  return Array.from(new Set(words.map((w) => w.trim().toLowerCase()).filter(Boolean))).slice(0, 50);
}

function formatDate(epochSeconds?: number | null): string {
  if (!epochSeconds) return '';
  const date = new Date(epochSeconds * 1000);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatTime(epochSeconds?: number | null): string {
  if (!epochSeconds) return '';
  const date = new Date(epochSeconds * 1000);
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

/** Fecha y hora de inicio por defecto: ahora mismo, segundos en cero */
function roundNowToMinute(): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  return d;
}

/** Desde Unix segundos; si viene vacío, devuelve ahora */
function scheduleFromEpoch(epochSeconds?: number | null): Date {
  if (epochSeconds == null || Number.isNaN(epochSeconds)) return roundNowToMinute();
  const d = new Date(epochSeconds * 1000);
  if (Number.isNaN(d.getTime())) return roundNowToMinute();
  return d;
}

function mergeCalendarDatePreserveTime(base: Date, picked: Date): Date {
  const out = new Date(base);
  out.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
  return out;
}

function mergeClockTimePreserveDate(base: Date, picked: Date): Date {
  const out = new Date(base);
  out.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  return out;
}

const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

function normalizeModeratorEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function looksLikeEmail(value: string): boolean {
  return LOOKS_LIKE_EMAIL.test(normalizeModeratorEmail(value));
}

function coverPhotoFromPicker(response: ImagePickerResponse): {
  uri: string;
  type?: string;
  name?: string;
} | null {
  if (response.didCancel || response.errorMessage) {
    return null;
  }
  const a = response.assets?.[0];
  if (!a?.uri) {
    return null;
  }
  return {
    uri: a.uri,
    type: a.type ?? 'image/jpeg',
    name: a.fileName ?? `live-cover-${Date.now()}.jpg`,
  };
}

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RNText style={styles.fieldLabel}>{children}</RNText>
);

const SelectField: React.FC<{
  label: string;
  value?: string | null;
  placeholder: string;
  icon?: React.ReactNode;
  onPress: () => void;
}> = ({ label, value, placeholder, icon, onPress }) => (
  <View style={styles.field}>
    <FieldLabel>{label}</FieldLabel>
    <TouchableOpacity style={styles.selectPill} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.selectLeft}>
        {icon}
        <RNText style={[styles.selectText, !value && styles.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </RNText>
      </View>
      <ChevronDown size={20} color={themeColors.glass.text} />
    </TouchableOpacity>
  </View>
);

const ToggleRow: React.FC<{
  title: string;
  body: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}> = ({ title, body, value, onValueChange }) => (
  <TouchableOpacity style={styles.toggleRow} onPress={() => onValueChange(!value)} activeOpacity={0.85}>
    <View style={styles.toggleTextCol}>
      <RNText style={styles.toggleTitle}>{title}</RNText>
      <RNText style={styles.toggleBody}>{body}</RNText>
    </View>
    <View style={styles.switchTrack}>
      <View style={[styles.switchThumb, value && styles.switchThumbOn]} />
    </View>
  </TouchableOpacity>
);

const RadioMark: React.FC<{ selected: boolean; square?: boolean }> = ({ selected, square }) => (
  <View style={[styles.radioOuter, square && styles.checkOuter]}>
    {selected ? square ? <Check size={14} color={themeColors.glass.text} strokeWidth={3} /> : <View style={styles.radioInner} /> : null}
  </View>
);

const ChoiceDrawer: React.FC<{
  visible: boolean;
  title: string;
  options: Array<{ id: string; label: string; body?: string }>;
  value: string;
  onClose: () => void;
  onSelect: (value: string) => void;
}> = ({ visible, title, options, value, onClose, onSelect }) => (
  <StreamBottomSheet
    visible={visible}
    title={title}
    onClose={onClose}
    bottomPanel
    panelStyle={panelStyle}
    contentContainerStyle={styles.choiceBody}
  >
    {options.map((option) => (
      <TouchableOpacity
        key={option.id}
        style={styles.choiceRow}
        onPress={() => {
          onSelect(option.id);
          onClose();
        }}
        activeOpacity={0.85}
      >
        <View style={styles.choiceTextCol}>
          <RNText style={styles.choiceLabel}>{option.label}</RNText>
          {option.body ? <RNText style={styles.choiceBodyText}>{option.body}</RNText> : null}
        </View>
        <RadioMark selected={value === option.id} />
      </TouchableOpacity>
    ))}
  </StreamBottomSheet>
);

const BlockedWordsDrawer: React.FC<{
  visible: boolean;
  initialWords: string[];
  onClose: () => void;
  onSave: (words: string[]) => void;
}> = ({ visible, initialWords, onClose, onSave }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(initialWords);
  const [input, setInput] = useState('');

  React.useEffect(() => {
    if (visible) {
      setDraft(initialWords);
      setInput('');
    }
  }, [visible, initialWords]);

  const addWord = () => {
    const clean = input.trim().toLowerCase();
    if (!clean) return;
    setDraft((prev) => sanitizeWords([...prev, clean]));
    setInput('');
  };

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('startLive.setupBlockedWords')}
      onClose={onClose}
      bottomPanel
      panelStyle={panelStyle}
      contentContainerStyle={styles.blockedBody}
      footer={
        <StartLivePrimaryButton
          label={t('startLive.saveCta')}
          onPress={() => onSave(sanitizeWords(draft))}
        />
      }
      cancelLabel={t('common.cancel')}
      onCancelPress={onClose}
      /** Tiene input + chips en borrador: tocar el fondo no puede descartarlos. */
      dismissOnBackdropPress={false}
    >
          <RNText style={styles.drawerText}>{t('startLive.setupBlockedWordsIntro')}</RNText>
          <View style={styles.searchPill}>
            <AppTextInput
              style={styles.searchInput}
              value={input}
              onChangeText={setInput}
              placeholder={t('startLive.setupBlockedWordsAdd')}
              placeholderTextColor={themeColors.glass.placeholder}
              returnKeyType="done"
              onSubmitEditing={addWord}
            />
            <TouchableOpacity onPress={addWord} hitSlop={12}>
              <Search size={22} color={START_LIVE_COLORS.border} />
            </TouchableOpacity>
          </View>
          {draft.length ? (
            <View style={styles.chipWrap}>
              {draft.map((word) => (
                <TouchableOpacity
                  key={word}
                  style={styles.wordChip}
                  onPress={() => setDraft((prev) => prev.filter((item) => item !== word))}
                  activeOpacity={0.85}
                >
                  <RNText style={styles.wordChipText} numberOfLines={1}>{word}</RNText>
                  <X size={16} color={themeColors.glass.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
    </StreamBottomSheet>
  );
};

const ModeratorsDrawer: React.FC<{
  visible: boolean;
  initialIds: string[];
  onClose: () => void;
  onSave: (ids: string[]) => void;
}> = ({ visible, initialIds, onClose, onSave }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(initialIds);
  const [input, setInput] = useState('');
  const [moderatorEmailInvalid, setModeratorEmailInvalid] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setDraft(initialIds);
      setInput('');
      setModeratorEmailInvalid(false);
    }
  }, [visible, initialIds]);

  const addModerator = () => {
    const normalized = normalizeModeratorEmail(input);
    if (!normalized) return;
    if (!looksLikeEmail(normalized)) {
      setModeratorEmailInvalid(true);
      return;
    }
    setModeratorEmailInvalid(false);
    setDraft((prev) => Array.from(new Set([...prev, normalized])).slice(0, 20));
    setInput('');
  };

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('startLive.setupModeratorsPlaceholder')}
      onClose={onClose}
      bottomPanel={false}
      fullHeight
      panelStyle={panelStyle}
      contentContainerStyle={styles.moderatorsBody}
      footer={<StartLivePrimaryButton label={t('startLive.saveCta')} onPress={() => onSave(draft)} />}
      cancelLabel={t('common.cancel')}
      onCancelPress={onClose}
      /** Lista de moderadores en borrador: tocar el fondo no puede descartarla. */
      dismissOnBackdropPress={false}
    >
          <View style={styles.searchPill}>
            <AppTextInput
              style={styles.searchInput}
              value={input}
              onChangeText={(v) => {
                setInput(v);
                if (moderatorEmailInvalid) setModeratorEmailInvalid(false);
              }}
              placeholder={t('startLive.setupModeratorsSearch')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={themeColors.glass.placeholder}
              returnKeyType="done"
              onSubmitEditing={addModerator}
            />
            <TouchableOpacity onPress={addModerator} hitSlop={12}>
              <Search size={22} color={START_LIVE_COLORS.border} />
            </TouchableOpacity>
          </View>
          {moderatorEmailInvalid ? <RNText style={styles.moderatorEmailError}>{t('common.invalidEmail')}</RNText> : null}
          <View style={styles.moderatorList}>
            {draft.length ? draft.map((id) => (
              <TouchableOpacity
                key={id}
                style={styles.moderatorRow}
                onPress={() => setDraft((prev) => prev.filter((item) => item !== id))}
                activeOpacity={0.85}
              >
                <View style={styles.avatarFallback}>
                  <UserRound size={30} color={START_LIVE_COLORS.border} />
                </View>
                <RNText style={styles.moderatorName} numberOfLines={1}>{id}</RNText>
                <RadioMark selected square />
              </TouchableOpacity>
            )) : (
              <RNText style={styles.drawerText}>{t('startLive.setupModeratorsHint')}</RNText>
            )}
          </View>
    </StreamBottomSheet>
  );
};

export const PreLiveSetupOverlay: React.FC<{
  initialConfig: StreamConfig;
  visible: boolean;
  onCancel: () => void;
  onStart: (config: StreamConfig) => void;
}> = ({ initialConfig, visible, onCancel, onStart }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { categories } = useInterestCategories();
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Entrada deslizando desde abajo, igual que las bases de sheet (el Modal no anima). */
  const slideAnim = useRef(new Animated.Value(1)).current;
  const [drawer, setDrawer] = useState<Drawer>('none');
  const [mediaPickerActive, setMediaPickerActive] = useState(false);
  const [title, setTitle] = useState(initialConfig.title || '');
  const [scheduleAt, setScheduleAt] = useState(() => scheduleFromEpoch(initialConfig.scheduledAt));
  const [showScheduleDatePicker, setShowScheduleDatePicker] = useState(false);
  const [showScheduleTimePicker, setShowScheduleTimePicker] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>(initialConfig.recurrence ?? 'none');
  const [moderatorIds, setModeratorIds] = useState<string[]>(initialConfig.moderatorUserIds ?? []);
  const [categoryUuids, setCategoryUuids] = useState<string[]>(initialConfig.interestCategoryUuids ?? []);
  const [saleFormat, setSaleFormat] = useState<SaleFormat>(initialConfig.saleFormat ?? 'individual');
  const [explicitContent, setExplicitContent] = useState(initialConfig.explicitContent ?? false);
  const [blockedWordsEnabled, setBlockedWordsEnabled] = useState(initialConfig.blockedWordsEnabled ?? false);
  const [blockedWords, setBlockedWords] = useState<string[]>(initialConfig.blockedWords ?? []);
  const [privacy, setPrivacy] = useState<Privacy>(initialConfig.privacy ?? 'public');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [liveCoverUrl, setLiveCoverUrl] = useState<string | null>(initialConfig.coverUrl ?? null);
  const [coverStagingUri, setCoverStagingUri] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);

  const clearLaunchTimers = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  useEffect(() => () => clearLaunchTimers(), [clearLaunchTimers]);

  useEffect(() => {
    if (!visible) return;
    setScheduleAt(scheduleFromEpoch(initialConfig.scheduledAt));
  }, [visible, initialConfig.scheduledAt]);

  useEffect(() => {
    if (!visible) return;
    setLiveCoverUrl(initialConfig.coverUrl ?? null);
    setCoverStagingUri(null);
    setCoverUploading(false);
  }, [visible, initialConfig.coverUrl]);

  useEffect(() => {
    if (!visible) {
      setMediaPickerActive(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      slideAnim.setValue(1);
      return;
    }
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      ...SHEET_SPRING,
    }).start();
  }, [visible, slideAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, LIVE_PRE_LAUNCH_HEIGHT],
  });

  const handleLeavePreLive = useCallback(() => {
    clearLaunchTimers();
    setCountdown(null);
    setShowScheduleDatePicker(false);
    setShowScheduleTimePicker(false);
    setDrawer('none');
    onCancel();
  }, [clearLaunchTimers, onCancel]);

  const categoryLabel = useMemo(() => {
    if (!categoryUuids.length) return null;
    const labels = categoryUuids
      .map((uuid) => categories.find((cat) => cat.uuid === uuid)?.label)
      .filter(Boolean);
    if (!labels.length) return t('startLive.setupCategoriesSelected', { count: categoryUuids.length });
    if (labels.length <= 2) return labels.join(', ');
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
  }, [categories, categoryUuids, t]);

  const frequencyOptions = useMemo(
    () => [
      { id: 'none' as Frequency, label: t('startLive.setupFrequencyNone') },
      { id: 'daily' as Frequency, label: t('startLive.setupFrequencyDaily') },
      { id: 'weekly' as Frequency, label: t('startLive.setupFrequencyWeekly') },
      { id: 'monthly' as Frequency, label: t('startLive.setupFrequencyMonthly') },
    ],
    [t],
  );

  const saleFormatOptions = useMemo(
    () => [
      {
        id: 'individual' as SaleFormat,
        label: t('startLive.setupSaleFormatIndividual'),
        body: t('startLive.setupSaleFormatIndividualBody'),
      },
      {
        id: 'auction_breaks' as SaleFormat,
        label: t('startLive.setupSaleFormatAuction'),
        body: t('startLive.setupSaleFormatAuctionBody'),
      },
      {
        id: 'surprise_boxes' as SaleFormat,
        label: t('startLive.setupSaleFormatBoxes'),
        body: t('startLive.setupSaleFormatBoxesBody'),
      },
    ],
    [t],
  );

  const frequencyLabel = frequencyOptions.find((opt) => opt.id === frequency)?.label ?? frequencyOptions[0].label;
  const saleFormatLabel = saleFormatOptions.find((opt) => opt.id === saleFormat)?.label ?? saleFormatOptions[0].label;

  const scheduleEpochSeconds = Math.floor(scheduleAt.getTime() / 1000);
  const scheduledDateDisplay = formatDate(scheduleEpochSeconds);
  const scheduledTimeDisplay = formatTime(scheduleEpochSeconds);

  const submitCoverPhoto = useCallback(
    async (photo: { uri: string; type?: string; name?: string }) => {
      setCoverStagingUri(photo.uri);
      setCoverUploading(true);
      try {
        const url = await uploadRoomCover(photo);
        setLiveCoverUrl(url);
        setCoverStagingUri(null);
      } catch (e) {
        setCoverStagingUri(null);
        const msg =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : t('startLive.setupCoverUploadError');
        appAlert(t('common.error'), msg);
      } finally {
        setCoverUploading(false);
      }
    },
    [t],
  );

  const resetMediaPickerUi = useCallback(() => {
    setMediaPickerActive(false);
  }, []);

  const handleCoverFromGallery = useCallback(() => {
    launchPhotoLibraryNow(
      { mediaType: 'photo', selectionLimit: 1 },
      (response) => {
        const p = coverPhotoFromPicker(response);
        if (p) void submitCoverPhoto(p);
      },
      { onAfter: resetMediaPickerUi, onError: resetMediaPickerUi },
    );
  }, [resetMediaPickerUi, submitCoverPhoto]);

  const handleCoverFromCamera = useCallback(() => {
    launchPhotoCameraNow(
      { mediaType: 'photo', cameraType: 'back', saveToPhotos: true },
      (response) => {
        const p = coverPhotoFromPicker(response);
        if (p) void submitCoverPhoto(p);
      },
      { onAfter: resetMediaPickerUi, onError: resetMediaPickerUi },
    );
  }, [resetMediaPickerUi, submitCoverPhoto]);

  const buildConfig = (): StreamConfig => ({
    ...initialConfig,
    title: title.trim() || initialConfig.title || 'Mi show',
    scheduledAt: scheduleEpochSeconds,
    interestCategoryUuids: categoryUuids,
    recurrence: frequency,
    moderatorUserIds: moderatorIds,
    saleFormat,
    explicitContent,
    blockedWordsEnabled,
    blockedWords: sanitizeWords(blockedWords),
    privacy,
    coverUrl: liveCoverUrl ?? null,
  });

  const startCountdown = () => {
    clearLaunchTimers();
    setCountdown(3);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          queueMicrotask(() => {
            onStart(buildConfig());
          });
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={!mediaPickerActive}
      transparent
      /** Sin animación de Modal: la entrada la hace el slide propio del sistema de sheets. */
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleLeavePreLive}
    >
      {/*
       * Los drawers de este asistente viven DENTRO de este Modal (su propia ventana
       * nativa): no deben irse al portal raíz, que queda por debajo y los ocultaría.
       */}
      <ModalWindowBoundary>
        {/* Wizard glass: siempre oscuro, la barra "Listo" del teclado acompaña. */}
        <KeyboardAccessoryAppearanceProvider appearance="dark">
        <View style={styles.overlay}>
          <GlassBackdrop />
          <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
            <KeyboardDismissScrollView
              style={styles.scrollBody}
              contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.header}>
                <RNText style={styles.title}>{t('startLive.configTitle')}</RNText>
                <TouchableOpacity onPress={handleLeavePreLive} hitSlop={12}>
                  <X size={22} color={themeColors.glass.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <View style={styles.field}>
                  <FieldLabel>{t('startLive.setupFieldName')}</FieldLabel>
                  <View style={styles.inputPill}>
                    <AppTextInput
                      style={styles.input}
                      value={title}
                      onChangeText={(v) => setTitle(v.replace(/^\s/, '').slice(0, 80))}
                      placeholder={t('startLive.setupFieldNamePlaceholder')}
                      placeholderTextColor={themeColors.glass.placeholder}
                    />
                  </View>
                </View>
                <View style={styles.field}>
                  <FieldLabel>{t('startLive.setupFieldDate')}</FieldLabel>
                  <TouchableOpacity
                    style={styles.inputPill}
                    onPress={() => setShowScheduleDatePicker(true)}
                    activeOpacity={0.85}
                  >
                    <RNText style={[styles.input, styles.inputTouchableText]}>{scheduledDateDisplay}</RNText>
                    <CalendarDays size={18} color={themeColors.glass.textMuted} />
                  </TouchableOpacity>
                </View>
                <View style={styles.field}>
                  <FieldLabel>{t('startLive.setupFieldTime')}</FieldLabel>
                  <TouchableOpacity style={styles.inputPill} onPress={() => setShowScheduleTimePicker(true)} activeOpacity={0.85}>
                    <RNText style={[styles.input, styles.inputTouchableText]}>{scheduledTimeDisplay}</RNText>
                    <Clock size={18} color={themeColors.glass.textMuted} />
                  </TouchableOpacity>
                </View>
                <SelectField
                  label={t('startLive.setupFrequency')}
                  value={frequencyLabel}
                  placeholder={t('startLive.setupFrequencyNone')}
                  onPress={() => setDrawer('frequency')}
                />
                <SelectField
                  label={t('startLive.setupModerators')}
                  value={moderatorIds.length ? t('startLive.setupModeratorsCount', { count: moderatorIds.length }) : null}
                  placeholder={t('startLive.setupModeratorsPlaceholder')}
                  icon={<UserRound size={22} color={themeColors.glass.placeholder} />}
                  onPress={() => setDrawer('moderators')}
                />
              </View>

              <View style={styles.section}>
                <SelectField
                  label={t('startLive.setupCategory')}
                  value={categoryLabel}
                  placeholder={t('startLive.setupCategoryPlaceholder')}
                  onPress={() => setDrawer('categories')}
                />
                <SelectField
                  label={t('startLive.setupSaleFormat')}
                  value={saleFormatLabel}
                  placeholder={t('startLive.setupSaleFormatPlaceholder')}
                  onPress={() => setDrawer('saleFormat')}
                />
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeading}>
                  <RNText style={styles.sectionTitle}>{t('startLive.setupMediaTitle')}</RNText>
                  <RNText style={styles.sectionBody}>{t('startLive.setupMediaBody')}</RNText>
                </View>
                <View style={styles.mediaRow}>
                  <View style={[styles.mediaCard, !!(liveCoverUrl || coverStagingUri) && styles.mediaCardHasCover]}>
                    <TouchableOpacity
                      style={[styles.coverCardTouch, !!(liveCoverUrl || coverStagingUri) && styles.coverCardTouchFilled]}
                      onPress={() => !coverUploading && setDrawer('coverSource')}
                      activeOpacity={0.85}
                      disabled={coverUploading}
                      accessibilityRole="button"
                      accessibilityLabel={t('startLive.setupAddCoverA11y')}
                    >
                      {liveCoverUrl || coverStagingUri ? (
                        <Image
                          source={{ uri: coverStagingUri ?? liveCoverUrl! }}
                          style={styles.coverThumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <>
                          <ImagePlus size={24} color={START_LIVE_COLORS.border} />
                          <RNText style={styles.mediaText}>{t('startLive.setupAddCover')}</RNText>
                        </>
                      )}
                      {coverUploading ? (
                        <View style={styles.coverUploadingOverlay}>
                          <ActivityIndicator size="large" color={themeColors.glass.text} />
                        </View>
                      ) : null}
                    </TouchableOpacity>
                    {(liveCoverUrl || coverStagingUri) && !coverUploading ? (
                      <TouchableOpacity
                        style={styles.coverClearBtn}
                        onPress={() => {
                          setLiveCoverUrl(null);
                          setCoverStagingUri(null);
                        }}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={t('startLive.setupRemoveCoverA11y')}
                      >
                        <X size={16} color={themeColors.glass.text} strokeWidth={2.5} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <TouchableOpacity style={styles.mediaCard} activeOpacity={0.85}>
                    <Video size={24} color={START_LIVE_COLORS.border} />
                    <RNText style={styles.mediaText}>{t('startLive.setupAddVideo')}</RNText>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <ToggleRow
                  title={t('startLive.setupExplicit')}
                  body={t('startLive.setupExplicitBody')}
                  value={explicitContent}
                  onValueChange={setExplicitContent}
                />
                <ToggleRow
                  title={t('startLive.setupBlockedWords')}
                  body={
                    blockedWords.length
                      ? t('startLive.setupBlockedWordsCount', { count: blockedWords.length })
                      : t('startLive.setupBlockedWordsBody')
                  }
                  value={blockedWordsEnabled}
                  onValueChange={(value) => {
                    setBlockedWordsEnabled(value);
                    if (value) setDrawer('blockedWords');
                  }}
                />
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeading}>
                  <RNText style={styles.sectionTitle}>{t('startLive.setupPrivacy')}</RNText>
                  <RNText style={styles.sectionBody}>{t('startLive.setupPrivacyBody')}</RNText>
                </View>
                {(['public', 'private'] as Privacy[]).map((item) => (
                  <TouchableOpacity key={item} style={styles.privacyRow} onPress={() => setPrivacy(item)} activeOpacity={0.85}>
                    <View style={styles.selectLeft}>
                      <UserRound size={20} color={themeColors.glass.placeholder} />
                      <RNText style={styles.selectText}>
                        {item === 'public' ? t('startLive.setupPrivacyPublic') : t('startLive.setupPrivacyPrivate')}
                      </RNText>
                    </View>
                    {privacy === item ? <CheckCircle2 size={22} color={themeColors.glass.text} /> : <RadioMark selected={false} />}
                  </TouchableOpacity>
                ))}
              </View>

            </KeyboardDismissScrollView>

            {/* CTA fijada al pie, fuera del scroll (canon de drawers) + safe area. */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <StartLivePrimaryButton
                label={t('startLive.saveCta')}
                onPress={startCountdown}
                disabled={!title.trim() || !categoryUuids.length || coverUploading}
              />
              <TouchableOpacity style={styles.cancelButton} onPress={handleLeavePreLive} activeOpacity={0.85}>
                <RNText style={styles.cancelText}>{t('common.cancel')}</RNText>
              </TouchableOpacity>
            </View>
          </Animated.View>

          <ChoiceDrawer
            visible={drawer === 'frequency'}
            title={t('startLive.setupFrequency')}
            options={frequencyOptions}
            value={frequency}
            onClose={() => setDrawer('none')}
            onSelect={(value) => setFrequency(value as Frequency)}
          />
          <ChoiceDrawer
            visible={drawer === 'saleFormat'}
            title={t('startLive.setupSaleFormat')}
            options={saleFormatOptions}
            value={saleFormat}
            onClose={() => setDrawer('none')}
            onSelect={(value) => setSaleFormat(value as SaleFormat)}
          />
          <ModeratorsDrawer
            visible={drawer === 'moderators'}
            initialIds={moderatorIds}
            onClose={() => setDrawer('none')}
            onSave={(ids) => {
              setModeratorIds(ids);
              setDrawer('none');
            }}
          />
          <BlockedWordsDrawer
            visible={drawer === 'blockedWords'}
            initialWords={blockedWords}
            onClose={() => setDrawer('none')}
            onSave={(words) => {
              setBlockedWords(words);
              setBlockedWordsEnabled(words.length > 0);
              setDrawer('none');
            }}
          />
          <StartLiveCategoriesDrawer
            visible={drawer === 'categories'}
            selectionMode="multiple"
            initialSelected={categoryUuids}
            onClose={() => setDrawer('none')}
            onContinue={(uuids) => {
              setCategoryUuids(uuids);
              setDrawer('none');
            }}
          />

          <AddProductPhotoSourceDrawer
            visible={drawer === 'coverSource'}
            presentation="overlay"
            photoCount={0}
            maxPhotos={1}
            onClose={() => setDrawer('none')}
            onBeforePicker={() => setMediaPickerActive(true)}
            onAfterPicker={resetMediaPickerUi}
            onTakePhoto={handleCoverFromCamera}
            onChooseGallery={handleCoverFromGallery}
          />

          {/* El overlay es un Modal nativo: los sheets van con nativeModal (default)
              para presentarse encadenados sobre esta ventana, no en el portal raíz. */}
          <AppDatePickerSheet
            visible={showScheduleDatePicker}
            title={t('startLive.setupFieldDate')}
            mode="date"
            value={scheduleAt}
            onChange={(d) => setScheduleAt((prev) => mergeCalendarDatePreserveTime(prev, d))}
            onClose={() => setShowScheduleDatePicker(false)}
          />

          <AppDatePickerSheet
            visible={showScheduleTimePicker}
            title={t('startLive.setupFieldTime')}
            mode="time"
            value={scheduleAt}
            onChange={(d) => setScheduleAt((prev) => mergeClockTimePreserveDate(prev, d))}
            onClose={() => setShowScheduleTimePicker(false)}
          />

          {countdown != null ? (
            <View style={styles.countdownOverlay}>
              <View style={styles.countdownSheet}>
                <View style={styles.countdownSheetHeader}>
                  <RNText style={styles.countdownHeaderTitle}>{t('stream.liveStartHeader')}</RNText>
                  <TouchableOpacity onPress={handleLeavePreLive} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('stream.cancelJoin')}>
                    <X size={24} color={themeColors.glass.text} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                <View style={styles.countdownSheetBody}>
                  <RNText style={styles.countdownCongrats}>{t('stream.liveStartCongrats')}</RNText>
                  <RNText style={styles.countdownIntro}>{t('stream.liveStartSubtitle')}</RNText>
                  <RNText style={styles.countdownBigNumber} accessibilityLiveRegion="polite">
                    {countdown}
                  </RNText>
                </View>
              </View>
              <View style={styles.countdownConfettiLayer} pointerEvents="none">
                <ConfettiCannon
                  count={120}
                  origin={{ x: LIVE_PRE_LAUNCH_WIDTH * 0.22, y: LIVE_PRE_LAUNCH_HEIGHT * 0.22 }}
                  explosionSpeed={420}
                  fallSpeed={3100}
                  fadeOut
                  autoStart
                  colors={LIVE_LAUNCH_CONFETTI_COLORS}
                />
                <ConfettiCannon
                  count={120}
                  origin={{ x: LIVE_PRE_LAUNCH_WIDTH * 0.78, y: LIVE_PRE_LAUNCH_HEIGHT * 0.22 }}
                  explosionSpeed={420}
                  fallSpeed={3100}
                  fadeOut
                  autoStart
                  colors={LIVE_LAUNCH_CONFETTI_COLORS}
                />
              </View>
            </View>
          ) : null}
        </View>
        </KeyboardAccessoryAppearanceProvider>
      </ModalWindowBoundary>
    </Modal>
  );
};

const styles = StyleSheet.create({
  /** El fondo lo pone <GlassBackdrop /> (mismo glass que los sheets full). */
  overlay: {
    flex: 1,
  },
  sheet: {
    flex: 1,
    width: '100%',
  },
  scrollBody: {
    flex: 1,
  },
  content: {
    gap: 24,
    padding: 24,
    /** paddingTop real = insets.top + 16 (se aplica inline). */
    paddingBottom: 24,
  },
  footer: {
    gap: 12,
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: themeColors.glass.text,
  },
  section: {
    gap: 12,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(221, 221, 221, 0.5)',
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    lineHeight: 18,
    letterSpacing: 0.05,
    color: themeColors.glass.text,
  },
  inputPill: {
    minHeight: 52,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: 0,
    margin: 0,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 20,
    color: themeColors.glass.text,
  },
  inputTouchableText: {
    textAlignVertical: 'center',
  },
  selectPill: {
    minHeight: 52,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  selectText: {
    flex: 1,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 20,
    color: themeColors.glass.text,
  },
  placeholder: {
    color: themeColors.glass.placeholder,
  },
  sectionHeading: {
    gap: 4,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    lineHeight: 28,
    color: themeColors.glass.text,
  },
  sectionBody: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.textMuted,
  },
  mediaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  mediaCard: {
    flex: 1,
    minHeight: 160,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: START_LIVE_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaCardHasCover: {
    paddingHorizontal: 0,
    gap: 0,
  },
  coverCardTouch: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    minHeight: 160,
  },
  coverCardTouchFilled: {
    minHeight: 160,
  },
  coverThumb: {
    ...StyleSheet.absoluteFillObject,
  },
  coverUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  coverClearBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(2,5,15,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  mediaText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.textMuted,
    textAlign: 'center',
  },
  toggleRow: {
    minHeight: 62,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleTextCol: {
    flex: 1,
    gap: 4,
  },
  toggleTitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.text,
  },
  toggleBody: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: themeColors.glass.textMuted,
  },
  switchTrack: {
    width: 31,
    height: 16,
    borderRadius: 100,
    backgroundColor: themeColors.glass.text,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#C7C8CA',
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
    backgroundColor: START_LIVE_COLORS.primary,
  },
  privacyRow: {
    minHeight: 52,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelButton: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: themeColors.gold,
  },
  choiceBody: {
    gap: 24,
    width: '100%',
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  choiceTextCol: {
    flex: 1,
    gap: 4,
  },
  choiceLabel: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.text,
  },
  choiceBodyText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 20,
    color: themeColors.glass.textMuted,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: START_LIVE_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(104,92,240,0.1)',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: START_LIVE_COLORS.primary,
  },
  checkOuter: {
    borderRadius: 4,
  },
  blockedBody: {
    gap: 24,
    width: '100%',
  },
  moderatorsBody: {
    gap: 24,
    width: '100%',
    flex: 1,
  },
  drawerText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.textMuted,
  },
  searchPill: {
    minHeight: 56,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: START_LIVE_COLORS.border,
    backgroundColor: themeColors.glass.inputBg,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    padding: 0,
    margin: 0,
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    color: themeColors.glass.text,
  },
  moderatorEmailError: {
    marginTop: 8,
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 11,
    lineHeight: 16,
    color: themeColors.danger,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  wordChip: {
    height: 32,
    maxWidth: 120,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: START_LIVE_COLORS.border,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordChipText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    color: themeColors.glass.textMuted,
    maxWidth: 76,
  },
  moderatorList: {
    flex: 1,
    gap: 18,
  },
  moderatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  moderatorName: {
    flex: 1,
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    color: themeColors.glass.text,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(2, 5, 15, 0.55)',
    zIndex: LAYERS.countdown,
    elevation: LAYERS.countdown,
  },
  countdownSheet: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    backgroundColor: 'rgba(2, 5, 15, 0.4)',
    padding: 24,
    gap: 16,
  },
  countdownSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  countdownHeaderTitle: {
    flex: 1,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: themeColors.glass.text,
  },
  countdownSheetBody: {
    minHeight: 136,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  countdownCongrats: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 20,
    lineHeight: 32,
    color: themeColors.glass.text,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  countdownIntro: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 20,
    lineHeight: 32,
    color: themeColors.glass.text,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  countdownBigNumber: {
    marginTop: 24,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 64,
    lineHeight: 72,
    color: themeColors.glass.text,
    textAlign: 'center',
  },
  countdownConfettiLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    elevation: 10,
  },
});
