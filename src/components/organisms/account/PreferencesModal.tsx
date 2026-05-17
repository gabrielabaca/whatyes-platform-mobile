/**
 * Modal preferencias — Figma 536-22895
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  Animated,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  Switch,
  Platform,
} from 'react-native';
import { X, ChevronDown, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBackdrop } from '../profile/GlassBackdrop';
import { FONT_FAMILY } from '../../../theme/typography';
import { useTheme, type ThemePreference } from '../../../context/ThemeContext';
import type { AppLanguage } from '../../../i18n/languagePreference';
import { persistLanguage } from '../../../i18n/languagePreference';
import i18n from '../../../i18n';
import {
  getRecordingDirectoryDisplay,
  openRecordingDirectory,
  pickRecordingDirectory,
  resetRecordingDirectoryToDefault,
} from '../../../native/recordingStorage';

const PRIMARY = '#685CF0';
const CANCEL_GOLD = '#FDC700';

const THEME_OPTIONS: ThemePreference[] = ['light', 'dark', 'system'];
const LANGUAGE_OPTIONS: AppLanguage[] = ['es', 'en'];

export interface PreferencesModalProps {
  visible: boolean;
  onClose: () => void;
  onLogout?: () => void;
  onDeleteAccount?: () => void;
}

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  visible,
  onClose,
  onLogout,
  onDeleteAccount,
}) => {
  const { t, i18n: i18nInstance } = useTranslation();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(1)).current;
  const { themePreference, setThemePreference } = useTheme();

  const [draftTheme, setDraftTheme] = useState<ThemePreference>(themePreference);
  const [draftLanguage, setDraftLanguage] = useState<AppLanguage>(
    (i18nInstance.language === 'en' ? 'en' : 'es') as AppLanguage
  );
  const [themePickerVisible, setThemePickerVisible] = useState(false);
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);
  const [recordingFolderPath, setRecordingFolderPath] = useState('');

  useEffect(() => {
    if (!visible) {
      return;
    }
    getRecordingDirectoryDisplay().then(setRecordingFolderPath).catch(() => {});
    slideAnim.setValue(1);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
    setDraftTheme(themePreference);
    setDraftLanguage(i18nInstance.language === 'en' ? 'en' : 'es');
  }, [visible, themePreference, i18nInstance.language, slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onClose();
      }
    });
  };

  const themeLabel = (key: ThemePreference) => {
    if (key === 'light') return t('theme.light');
    if (key === 'dark') return t('theme.dark');
    return t('theme.automatic');
  };

  const languageLabel = (code: AppLanguage) =>
    code === 'es' ? t('account.preferencesModal.langEs') : t('account.preferencesModal.langEn');

  const handleSave = async () => {
    setThemePreference(draftTheme);
    await persistLanguage(draftLanguage);
    if (i18n.language !== draftLanguage) {
      await i18n.changeLanguage(draftLanguage);
    }
    handleClose();
  };

  const handleDeleteAccount = () => {
    onDeleteAccount?.();
  };

  const handleSignOut = () => {
    handleClose();
    onLogout?.();
  };

  const handlePickRecordingFolder = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert(t('common.appName'), t('account.preferencesModal.recordingFolderIosHint'));
      return;
    }
    try {
      const prefs = await pickRecordingDirectory();
      if (prefs) {
        setRecordingFolderPath(prefs.displayPath);
      }
    } catch {
      Alert.alert(t('common.appName'), t('account.preferencesModal.recordingFolderPickError'));
    }
  };

  const handleOpenRecordingFolder = async () => {
    try {
      await openRecordingDirectory();
    } catch {
      Alert.alert(t('common.appName'), t('account.preferencesModal.recordingFolderOpenError'));
    }
  };

  const handleResetRecordingFolder = async () => {
    const prefs = await resetRecordingDirectoryToDefault();
    setRecordingFolderPath(prefs.displayPath);
  };

  if (!visible) {
    return null;
  }

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 800],
  });

  return (
    <View style={styles.host} pointerEvents="box-none">
      <GlassBackdrop />
      <TouchableOpacity
        style={styles.backdropPress}
        activeOpacity={1}
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel={t('account.preferencesModal.cancel')}
      />

      <Animated.View
        style={[styles.sheet, { transform: [{ translateY }], paddingBottom: insets.bottom }]}
        pointerEvents="box-none"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.header}>
            <RNText style={styles.title}>{t('account.preferencesModal.title')}</RNText>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel={t('account.preferencesModal.close')}
            >
              <X size={22} color="#FFFFFF" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <RNText style={styles.sectionTitle}>{t('account.preferencesModal.accessibility')}</RNText>

            <FieldLabel text={t('account.preferencesModal.mode')} />
            <PickerRow
              value={themeLabel(draftTheme)}
              onPress={() => setThemePickerVisible(true)}
            />

            <FieldLabel text={t('account.preferencesModal.language')} />
            <PickerRow
              value={languageLabel(draftLanguage)}
              onPress={() => setLanguagePickerVisible(true)}
            />
          </View>

          <View style={[styles.section, styles.sectionBorder]}>
            <RNText style={styles.sectionTitle}>
              {t('account.preferencesModal.recordings')}
            </RNText>
            <FieldLabel text={t('account.preferencesModal.recordingSavePath')} />
            <RNText style={styles.pathPreview} numberOfLines={2}>
              {recordingFolderPath || t('account.preferencesModal.recordingDefaultPath')}
            </RNText>
            <ActionRow
              label={t('account.preferencesModal.chooseRecordingFolder')}
              onPress={handlePickRecordingFolder}
            />
            <ActionRow
              label={t('account.preferencesModal.openRecordingFolder')}
              onPress={handleOpenRecordingFolder}
            />
            <ActionRow
              label={t('account.preferencesModal.resetRecordingFolder')}
              onPress={handleResetRecordingFolder}
            />
          </View>

          <View style={[styles.section, styles.sectionBorder]}>
            <RNText style={styles.sectionTitle}>{t('account.preferencesModal.permissions')}</RNText>
            <FieldLabel text={t('account.preferencesModal.appPermissions')} />
            <View style={styles.pillRow}>
              <RNText style={styles.pillValue}>{t('account.preferencesModal.enablePermissions')}</RNText>
              <Switch
                value
                disabled
                trackColor={{ false: '#767577', true: '#FFFFFF' }}
                thumbColor={PRIMARY}
                ios_backgroundColor="#767577"
              />
            </View>
          </View>

          <View style={styles.accountActions}>
            <ActionRow
              label={t('account.preferencesModal.signOut')}
              onPress={handleSignOut}
            />
            <ActionRow
              label={t('account.preferencesModal.deleteAccount')}
              onPress={handleDeleteAccount}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.88}>
              <RNText style={styles.saveBtnText}>{t('account.preferencesModal.save')}</RNText>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <RNText style={styles.cancelText}>{t('account.preferencesModal.cancel')}</RNText>
            </TouchableOpacity>
          </View>

          <View style={styles.homeIndicator}>
            <View style={styles.homeIndicatorBar} />
          </View>
        </ScrollView>
      </Animated.View>

      <OptionPickerModal
        visible={themePickerVisible}
        title={t('account.preferencesModal.selectMode')}
        options={THEME_OPTIONS.map((key) => ({
          key,
          label: themeLabel(key),
          selected: draftTheme === key,
        }))}
        onSelect={(key) => {
          setDraftTheme(key as ThemePreference);
          setThemePickerVisible(false);
        }}
        onClose={() => setThemePickerVisible(false)}
      />

      <OptionPickerModal
        visible={languagePickerVisible}
        title={t('account.preferencesModal.selectLanguage')}
        options={LANGUAGE_OPTIONS.map((key) => ({
          key,
          label: languageLabel(key),
          selected: draftLanguage === key,
        }))}
        onSelect={(key) => {
          setDraftLanguage(key as AppLanguage);
          setLanguagePickerVisible(false);
        }}
        onClose={() => setLanguagePickerVisible(false)}
      />

    </View>
  );
};

const FieldLabel: React.FC<{ text: string }> = ({ text }) => (
  <RNText style={styles.fieldLabel}>{text}</RNText>
);

const PickerRow: React.FC<{ value: string; onPress: () => void }> = ({ value, onPress }) => (
  <TouchableOpacity style={styles.pillRow} onPress={onPress} activeOpacity={0.85}>
    <RNText style={styles.pillValue} numberOfLines={1}>
      {value}
    </RNText>
    <ChevronDown size={20} color="rgba(255,255,255,0.85)" />
  </TouchableOpacity>
);

const ActionRow: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => (
  <TouchableOpacity style={styles.pillRow} onPress={onPress} activeOpacity={0.85}>
    <RNText style={styles.pillValue}>{label}</RNText>
    <ChevronRight size={16} color="rgba(255,255,255,0.85)" />
  </TouchableOpacity>
);

const OptionPickerModal: React.FC<{
  visible: boolean;
  title: string;
  options: { key: string; label: string; selected: boolean }[];
  onSelect: (key: string) => void;
  onClose: () => void;
}> = ({ visible, title, options, onSelect, onClose }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.pickerOverlay}>
      <View style={styles.pickerSheet}>
        <View style={styles.pickerHeader}>
          <RNText style={styles.pickerTitle}>{title}</RNText>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <X size={22} color="#18181B" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={options}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.pickerItem}
              onPress={() => onSelect(item.key)}
            >
              <RNText style={[styles.pickerName, item.selected && styles.pickerNameSelected]}>
                {item.label}
              </RNText>
              {item.selected ? <RNText style={styles.pickerCheck}>✓</RNText> : null}
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    elevation: 200,
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  sheet: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    flex: 1,
    includeFontPadding: false,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: 8,
    width: '100%',
  },
  sectionBorder: {
    borderTopWidth: 1,
    borderTopColor: '#DDDDDD',
    paddingTop: 24,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 18,
    color: '#FFFFFF',
    letterSpacing: 0.07,
    marginBottom: 8,
    includeFontPadding: false,
  },
  fieldLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    lineHeight: 18,
    color: '#FFFFFF',
    letterSpacing: 0.05,
    includeFontPadding: false,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 1000,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 12,
    minHeight: 56,
  },
  pillValue: {
    flex: 1,
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    letterSpacing: 0.07,
    includeFontPadding: false,
  },
  pathPreview: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 4,
    marginBottom: 4,
    includeFontPadding: false,
  },
  accountActions: {
    gap: 8,
    paddingBottom: 8,
  },
  actions: {
    gap: 24,
    alignItems: 'center',
  },
  saveBtn: {
    width: '100%',
    height: 40,
    borderRadius: 1000,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  saveBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  cancelText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: CANCEL_GOLD,
    includeFontPadding: false,
  },
  homeIndicator: {
    height: 31,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  homeIndicatorBar: {
    width: 134,
    height: 5,
    borderRadius: 100,
    backgroundColor: '#C7C8CA',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    paddingBottom: 24,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    color: '#18181B',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerName: {
    flex: 1,
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 16,
    color: '#111827',
  },
  pickerNameSelected: {
    color: PRIMARY,
  },
  pickerCheck: {
    fontSize: 18,
    color: PRIMARY,
    fontWeight: '700',
  },
});
