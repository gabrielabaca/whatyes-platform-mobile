import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ImagePickerResponse } from 'react-native-image-picker';
import { launchPhotoCameraNow, launchPhotoLibraryNow } from '../../../utils/mediaPicker';
import {
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text as RNText,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
  Image,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
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
import type { StreamConfig } from '../../pages/StreamConfigScreen';
import { uploadRoomCover } from '../../../api/platformApi';
import { ApiError } from '../../../api/authApi';
import { useInterestCategories } from '../../../hooks/useInterestCategories';
import { FONT_FAMILY } from '../../../theme/typography';
import { KeyboardDismissScrollView } from '../../atoms/KeyboardDismissScrollView';
import { StreamBottomSheet } from '../stream/StreamBottomSheet';
import { AddProductPhotoSourceDrawer } from '../addProduct/AddProductPhotoSourceDrawer';
import { StartLiveCategoriesDrawer } from './StartLiveCategoriesDrawer';
import { StartLivePrimaryButton } from './StartLivePrimitives';
import { START_LIVE_COLORS, startLivePanelStyle } from './startLiveStyles';

type Frequency = NonNullable<StreamConfig['recurrence']>;
type SaleFormat = NonNullable<StreamConfig['saleFormat']>;
type Privacy = NonNullable<StreamConfig['privacy']>;
type Drawer = 'none' | 'frequency' | 'moderators' | 'categories' | 'saleFormat' | 'blockedWords' | 'coverSource';

const FREQUENCY_OPTIONS: Array<{ id: Frequency; label: string }> = [
  { id: 'none', label: 'No repetir' },
  { id: 'daily', label: 'Diariamente' },
  { id: 'weekly', label: 'Semanalmente' },
  { id: 'monthly', label: 'Mensualmente' },
];

const SALE_FORMAT_OPTIONS: Array<{ id: SaleFormat; label: string; body: string }> = [
  { id: 'individual', label: 'Productos individuales', body: 'Vende artículos uno por uno de forma directa.' },
  { id: 'auction_breaks', label: 'Subastas o breaks', body: 'Los compradores participan por productos o paquetes cerrados en dinámicas en vivo.' },
  { id: 'surprise_boxes', label: 'Cajas sorpresa', body: 'Vende bundles sorpresa donde el comprador descubre el contenido al recibirlo.' },
];

const preLiveSheetPanelExtra: ViewStyle = {
  paddingTop: 28,
};

const panelStyle: StyleProp<ViewStyle> = [startLivePanelStyle, preLiveSheetPanelExtra];

const { width: LIVE_PRE_LAUNCH_WIDTH, height: LIVE_PRE_LAUNCH_HEIGHT } = Dimensions.get('window');
const LIVE_LAUNCH_CONFETTI_COLORS = ['#685CF0', '#FB2C36', '#FDC700', '#22C55E', '#FFFFFF', '#CBCEFF'];

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
      <ChevronDown size={20} color="#FFFFFF" />
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
    {selected ? square ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : <View style={styles.radioInner} /> : null}
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
      title="Bloquear palabras"
      onClose={onClose}
      bottomPanel
      panelStyle={panelStyle}
      contentContainerStyle={styles.blockedBody}
      footer={<StartLivePrimaryButton label="Guardar" onPress={() => onSave(sanitizeWords(draft))} />}
      cancelLabel="Cancelar"
      onCancelPress={onClose}
    >
          <RNText style={styles.drawerText}>
            Permite filtrar términos específicos para evitar que aparezcan en el chat o comentarios para mantener un ambiente respetuoso y libre de contenido inapropiado durante la transmisión.
          </RNText>
          <View style={styles.searchPill}>
            <TextInput
              style={styles.searchInput}
              value={input}
              onChangeText={setInput}
              placeholder="Agregar palabras"
              placeholderTextColor="#FFFFFF"
              returnKeyType="done"
              onSubmitEditing={addWord}
            />
            <TouchableOpacity onPress={addWord} hitSlop={12}>
              <Search size={22} color="#CBCEFF" />
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
                  <X size={16} color="#D9D9D9" />
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
      title="Seleccionar moderadores"
      onClose={onClose}
      bottomPanel={false}
      fullHeight
      panelStyle={panelStyle}
      contentContainerStyle={styles.moderatorsBody}
      footer={<StartLivePrimaryButton label="Guardar" onPress={() => onSave(draft)} />}
      cancelLabel="Cancelar"
      onCancelPress={onClose}
    >
          <View style={styles.searchPill}>
            <TextInput
              style={styles.searchInput}
              value={input}
              onChangeText={(v) => {
                setInput(v);
                if (moderatorEmailInvalid) setModeratorEmailInvalid(false);
              }}
              placeholder="Buscar por email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#FFFFFF"
              returnKeyType="done"
              onSubmitEditing={addModerator}
            />
            <TouchableOpacity onPress={addModerator} hitSlop={12}>
              <Search size={22} color="#CBCEFF" />
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
                  <UserRound size={30} color="#CBCEFF" />
                </View>
                <RNText style={styles.moderatorName} numberOfLines={1}>{id}</RNText>
                <RadioMark selected square />
              </TouchableOpacity>
            )) : (
              <RNText style={styles.drawerText}>
                Agregá moderadores solo con correo electrónico (nombre@ejemplo.com). Quedarán guardados para esta sala.
              </RNText>
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
  const schemeDark = useColorScheme() === 'dark';
  const { categories } = useInterestCategories();
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
    if (!labels.length) return `${categoryUuids.length} seleccionadas`;
    if (labels.length <= 2) return labels.join(', ');
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
  }, [categories, categoryUuids]);

  const frequencyLabel = FREQUENCY_OPTIONS.find((opt) => opt.id === frequency)?.label ?? 'No repetir';
  const saleFormatLabel = SALE_FORMAT_OPTIONS.find((opt) => opt.id === saleFormat)?.label ?? 'Productos individuales';

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
              : 'No se pudo subir la imagen.';
        Alert.alert(t('common.error'), msg);
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
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleLeavePreLive}
    >
      <View style={styles.overlay}>
        <KeyboardDismissScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <RNText style={styles.title}>Configura tu live</RNText>
            <TouchableOpacity onPress={handleLeavePreLive} hitSlop={12}>
              <X size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <View style={styles.field}>
              <FieldLabel>Nombre del live</FieldLabel>
              <View style={styles.inputPill}>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={(v) => setTitle(v.replace(/^\s/, '').slice(0, 80))}
                  placeholder="Nombre"
                  placeholderTextColor="#BABABA"
                />
              </View>
            </View>
            <View style={styles.field}>
              <FieldLabel>Fecha</FieldLabel>
              <TouchableOpacity
                style={styles.inputPill}
                onPress={() => setShowScheduleDatePicker(true)}
                activeOpacity={0.85}
              >
                <RNText style={[styles.input, styles.inputTouchableText]}>{scheduledDateDisplay}</RNText>
                <CalendarDays size={18} color="#D9D9D9" />
              </TouchableOpacity>
            </View>
            <View style={styles.field}>
              <FieldLabel>Hora</FieldLabel>
              <TouchableOpacity style={styles.inputPill} onPress={() => setShowScheduleTimePicker(true)} activeOpacity={0.85}>
                <RNText style={[styles.input, styles.inputTouchableText]}>{scheduledTimeDisplay}</RNText>
                <Clock size={18} color="#D9D9D9" />
              </TouchableOpacity>
            </View>
            <SelectField label="Frecuencia" value={frequencyLabel} placeholder="No repetir" onPress={() => setDrawer('frequency')} />
            <SelectField
              label="Agregar moderadores"
              value={moderatorIds.length ? `${moderatorIds.length} moderador(es)` : null}
              placeholder="Seleccionar moderadores"
              icon={<UserRound size={22} color="#BABABA" />}
              onPress={() => setDrawer('moderators')}
            />
          </View>

          <View style={styles.section}>
            <SelectField label="Categoría" value={categoryLabel} placeholder="Selecciona una categoría" onPress={() => setDrawer('categories')} />
            <SelectField label="Formato de venta" value={saleFormatLabel} placeholder="Selecciona un formato" onPress={() => setDrawer('saleFormat')} />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <RNText style={styles.sectionTitle}>Multimedia</RNText>
              <RNText style={styles.sectionBody}>Agrega contenido multimedia para que tu live sea mas atractivo</RNText>
            </View>
            <View style={styles.mediaRow}>
              <View style={[styles.mediaCard, !!(liveCoverUrl || coverStagingUri) && styles.mediaCardHasCover]}>
                <TouchableOpacity
                  style={[styles.coverCardTouch, !!(liveCoverUrl || coverStagingUri) && styles.coverCardTouchFilled]}
                  onPress={() => !coverUploading && setDrawer('coverSource')}
                  activeOpacity={0.85}
                  disabled={coverUploading}
                  accessibilityRole="button"
                  accessibilityLabel="Agregar cover del live"
                >
                  {liveCoverUrl || coverStagingUri ? (
                    <Image
                      source={{ uri: coverStagingUri ?? liveCoverUrl! }}
                      style={styles.coverThumb}
                      resizeMode="cover"
                    />
                  ) : (
                    <>
                      <ImagePlus size={24} color="#CBCEFF" />
                      <RNText style={styles.mediaText}>Agregar un Cover</RNText>
                    </>
                  )}
                  {coverUploading ? (
                    <View style={styles.coverUploadingOverlay}>
                      <ActivityIndicator size="large" color="#FFFFFF" />
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
                    accessibilityLabel="Quitar imagen de cover"
                  >
                    <X size={16} color="#FFFFFF" strokeWidth={2.5} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity style={styles.mediaCard} activeOpacity={0.85}>
                <Video size={24} color="#CBCEFF" />
                <RNText style={styles.mediaText}>Agregar un video</RNText>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <ToggleRow title="Contenido explicito" body="Activalo si tu live contiene contenido explicito" value={explicitContent} onValueChange={setExplicitContent} />
            <ToggleRow
              title="Bloquear palabras"
              body={blockedWords.length ? `${blockedWords.length} palabras bloqueadas` : 'Bloquea las palabras de tu chat en vivo'}
              value={blockedWordsEnabled}
              onValueChange={(value) => {
                setBlockedWordsEnabled(value);
                if (value) setDrawer('blockedWords');
              }}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <RNText style={styles.sectionTitle}>Privacidad</RNText>
              <RNText style={styles.sectionBody}>¿Cómo quieres mostrar tus live?</RNText>
            </View>
            {(['public', 'private'] as Privacy[]).map((item) => (
              <TouchableOpacity key={item} style={styles.privacyRow} onPress={() => setPrivacy(item)} activeOpacity={0.85}>
                <View style={styles.selectLeft}>
                  <UserRound size={20} color="#BABABA" />
                  <RNText style={styles.selectText}>{item === 'public' ? 'Publica' : 'Privado'}</RNText>
                </View>
                {privacy === item ? <CheckCircle2 size={22} color="#FFFFFF" /> : <RadioMark selected={false} />}
              </TouchableOpacity>
            ))}
          </View>

          <StartLivePrimaryButton
            label="Guardar"
            onPress={startCountdown}
            disabled={!title.trim() || !categoryUuids.length || coverUploading}
          />
          <TouchableOpacity style={styles.cancelButton} onPress={handleLeavePreLive} activeOpacity={0.85}>
            <RNText style={styles.cancelText}>Cancelar</RNText>
          </TouchableOpacity>
        </KeyboardDismissScrollView>

        <ChoiceDrawer
          visible={drawer === 'frequency'}
          title="Frecuencia"
          options={FREQUENCY_OPTIONS}
          value={frequency}
          onClose={() => setDrawer('none')}
          onSelect={(value) => setFrequency(value as Frequency)}
        />
        <ChoiceDrawer
          visible={drawer === 'saleFormat'}
          title="Formato de venta"
          options={SALE_FORMAT_OPTIONS}
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

        <Modal
          visible={showScheduleDatePicker}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setShowScheduleDatePicker(false)}
        >
          <View style={styles.schedulePickerBackdrop}>
            <Pressable style={styles.schedulePickerBackdropPress} onPress={() => setShowScheduleDatePicker(false)} />
            <View style={[styles.schedulePickerChrome, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <View style={styles.schedulePickerToolbar}>
                <TouchableOpacity style={styles.schedulePickerToolbarBtn} onPress={() => setShowScheduleDatePicker(false)}>
                  <RNText style={styles.schedulePickerToolbarLabel}>{t('common.cancel')}</RNText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.schedulePickerToolbarBtn} onPress={() => setShowScheduleDatePicker(false)}>
                  <RNText style={styles.schedulePickerToolbarLabel}>{t('common.done')}</RNText>
                </TouchableOpacity>
              </View>
              <View style={styles.schedulePickerBody}>
                <DateTimePicker
                  value={scheduleAt}
                  mode="date"
                  display="spinner"
                  locale="es-AR"
                  themeVariant={schemeDark ? 'dark' : 'light'}
                  onChange={(_, d) => {
                    if (!d) return;
                    setScheduleAt((prev) => mergeCalendarDatePreserveTime(prev, d));
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showScheduleTimePicker}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setShowScheduleTimePicker(false)}
        >
          <View style={styles.schedulePickerBackdrop}>
            <Pressable style={styles.schedulePickerBackdropPress} onPress={() => setShowScheduleTimePicker(false)} />
            <View style={[styles.schedulePickerChrome, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <View style={styles.schedulePickerToolbar}>
                <TouchableOpacity style={styles.schedulePickerToolbarBtn} onPress={() => setShowScheduleTimePicker(false)}>
                  <RNText style={styles.schedulePickerToolbarLabel}>{t('common.cancel')}</RNText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.schedulePickerToolbarBtn} onPress={() => setShowScheduleTimePicker(false)}>
                  <RNText style={styles.schedulePickerToolbarLabel}>{t('common.done')}</RNText>
                </TouchableOpacity>
              </View>
              <View style={styles.schedulePickerBody}>
                <DateTimePicker
                  value={scheduleAt}
                  mode="time"
                  display="spinner"
                  locale="es-AR"
                  themeVariant={schemeDark ? 'dark' : 'light'}
                  onChange={(_, d) => {
                    if (!d) return;
                    setScheduleAt((prev) => mergeClockTimePreserveDate(prev, d));
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>

        {countdown != null ? (
          <View style={styles.countdownOverlay}>
            <View style={styles.countdownSheet}>
              <View style={styles.countdownSheetHeader}>
                <RNText style={styles.countdownHeaderTitle}>{t('stream.liveStartHeader')}</RNText>
                <TouchableOpacity onPress={handleLeavePreLive} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('stream.cancelJoin')}>
                  <X size={24} color="#FFFFFF" strokeWidth={2} />
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
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 5, 15, 0.6)',
  },
  content: {
    gap: 24,
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 58 : 32,
    paddingBottom: 40,
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
    color: '#FFFFFF',
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
    color: '#FFFFFF',
  },
  inputPill: {
    minHeight: 52,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#DDDDDD',
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
    color: '#FFFFFF',
  },
  inputTouchableText: {
    textAlignVertical: 'center',
  },
  selectPill: {
    minHeight: 52,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#DDDDDD',
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
    color: '#FFFFFF',
  },
  placeholder: {
    color: '#BABABA',
  },
  sectionHeading: {
    gap: 4,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    lineHeight: 28,
    color: '#FFFFFF',
  },
  sectionBody: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#D9D9D9',
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
    borderColor: '#CBCEFF',
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
    color: '#D9D9D9',
    textAlign: 'center',
  },
  toggleRow: {
    minHeight: 62,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#DDDDDD',
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
    color: '#FFFFFF',
  },
  toggleBody: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: '#D9D9D9',
  },
  switchTrack: {
    width: 31,
    height: 16,
    borderRadius: 100,
    backgroundColor: '#FFFEFE',
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
    borderColor: '#DDDDDD',
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
    color: '#FBBF24',
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
    color: '#FFFFFF',
  },
  choiceBodyText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 20,
    color: '#D9D9D9',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBCEFF',
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
    color: '#D9D9D9',
  },
  searchPill: {
    minHeight: 56,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#CBCEFF',
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    color: '#FFFFFF',
  },
  moderatorEmailError: {
    marginTop: 8,
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 11,
    lineHeight: 16,
    color: '#FB7185',
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
    borderColor: '#CBCEFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordChipText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    color: '#D9D9D9',
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
    color: '#FFFFFF',
  },
  schedulePickerBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  schedulePickerBackdropPress: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  schedulePickerChrome: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FEFEFE',
    width: '100%',
    overflow: 'hidden',
  },
  schedulePickerToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  schedulePickerToolbarBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  schedulePickerToolbarLabel: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 16,
    color: START_LIVE_COLORS.primary,
  },
  schedulePickerBody: {
    alignItems: 'stretch',
    paddingVertical: 8,
    width: '100%',
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(2, 5, 15, 0.55)',
    zIndex: 500,
    elevation: 500,
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
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  countdownIntro: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 20,
    lineHeight: 32,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  countdownBigNumber: {
    marginTop: 24,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 64,
    lineHeight: 72,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  countdownConfettiLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    elevation: 10,
  },
});
