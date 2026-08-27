/**
 * Modal preferencias — Figma 536-22895
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  Linking,
  Platform,
} from 'react-native';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { GlassFullScreenModal, type GlassFullScreenModalHandle } from '../profile/GlassFullScreenModal';
import { GlassModalHeader } from '../profile/GlassModalHeader';
import { AppOptionPickerSheet } from '../../molecules/AppOptionPickerSheet';
import { DeleteAccountModal } from './DeleteAccountModal';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
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
import { appAlert } from '../../../alerts';

const THEME_OPTIONS: ThemePreference[] = ['light', 'dark', 'system'];
const LANGUAGE_OPTIONS: AppLanguage[] = ['es', 'en'];

export interface PreferencesModalProps {
  visible: boolean;
  onClose: () => void;
  onLogout?: () => void;
  /** Se llama después de borrar la cuenta, para cerrar sesión. */
  onAccountDeleted?: () => void;
}

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  visible,
  onClose,
  onLogout,
  onAccountDeleted,
}) => {
  const { t, i18n: i18nInstance } = useTranslation();
  const modalRef = useRef<GlassFullScreenModalHandle>(null);
  const { themePreference, setThemePreference } = useTheme();

  const [draftTheme, setDraftTheme] = useState<ThemePreference>(themePreference);
  const [draftLanguage, setDraftLanguage] = useState<AppLanguage>(
    (i18nInstance.language === 'en' ? 'en' : 'es') as AppLanguage
  );
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [themePickerVisible, setThemePickerVisible] = useState(false);
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);
  const [recordingFolderPath, setRecordingFolderPath] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
    getRecordingDirectoryDisplay().then(setRecordingFolderPath).catch(() => {});
    setDraftTheme(themePreference);
    setDraftLanguage(i18nInstance.language === 'en' ? 'en' : 'es');
  }, [visible, themePreference, i18nInstance.language]);

  const handleClose = () => {
    modalRef.current?.dismiss();
  };

  const themeLabel = (key: ThemePreference) => {
    if (key === 'light') return t('theme.light');
    if (key === 'dark') return t('theme.dark');
    return t('theme.automatic');
  };

  const languageLabel = (code: AppLanguage) =>
    code === 'es' ? t('account.preferencesModal.langEs') : t('account.preferencesModal.langEn');

  const handleSave = async () => {
    if (saving) {
      return;
    }
    setSaving(true);
    try {
      setThemePreference(draftTheme);
      await persistLanguage(draftLanguage);
      if (i18n.language !== draftLanguage) {
        await i18n.changeLanguage(draftLanguage);
      }
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  /**
   * El modal de borrado se monta DENTRO de este (ver `overlay`), no como hermano: en iOS
   * un Modal hermano no se presenta mientras este ya está presentado y el botón no hacía nada.
   */
  const handleDeleteAccount = () => {
    setDeleteVisible(true);
  };

  const handleAccountDeleted = () => {
    setDeleteVisible(false);
    handleClose();
    onAccountDeleted?.();
  };

  const handleSignOut = () => {
    handleClose();
    onLogout?.();
  };

  const handlePickRecordingFolder = async () => {
    if (Platform.OS !== 'android') {
      appAlert(t('common.appName'), t('account.preferencesModal.recordingFolderIosHint'));
      return;
    }
    try {
      const prefs = await pickRecordingDirectory();
      if (prefs) {
        setRecordingFolderPath(prefs.displayPath);
      }
    } catch {
      appAlert(t('common.appName'), t('account.preferencesModal.recordingFolderPickError'));
    }
  };

  const handleOpenRecordingFolder = async () => {
    try {
      await openRecordingDirectory();
    } catch {
      appAlert(t('common.appName'), t('account.preferencesModal.recordingFolderOpenError'));
    }
  };

  const handleResetRecordingFolder = async () => {
    const prefs = await resetRecordingDirectoryToDefault();
    setRecordingFolderPath(prefs.displayPath);
  };

  const handleOpenSystemSettings = () => {
    Linking.openSettings().catch((e) => {
      console.warn('[PreferencesModal] openSettings:', e);
    });
  };

  return (
      <GlassFullScreenModal
        ref={modalRef}
        visible={visible}
        onClose={onClose}
        backdropAccessibilityLabel={t('account.preferencesModal.cancel')}
        dismissOnBackdropPress={false}
        /**
         * Los pickers van acá y no como hermanos del modal: en iOS un Modal hermano no
         * se presenta mientras este ya está presentado, y el desplegable no abría.
         */
        overlay={
          <>
            <DeleteAccountModal
              visible={deleteVisible}
              onClose={() => setDeleteVisible(false)}
              onDeleted={handleAccountDeleted}
            />
            <AppOptionPickerSheet
              visible={themePickerVisible}
              nativeModal={false}
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
            <AppOptionPickerSheet
              visible={languagePickerVisible}
              nativeModal={false}
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
          </>
        }
        header={
          <GlassModalHeader
            title={t('account.preferencesModal.title')}
            onClose={handleClose}
          />
        }
        footer={
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.88}
            >
              <RNText style={styles.saveBtnText}>{t('account.preferencesModal.save')}</RNText>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <RNText style={styles.cancelText}>{t('account.preferencesModal.cancel')}</RNText>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.scrollContent}
      >
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
            {Platform.OS === 'ios' ? (
              // En iOS no hay carpeta elegible: los clips van siempre a Fotos.
              <RNText style={styles.pathPreview}>
                {t('account.preferencesModal.recordingFolderIosHint')}
              </RNText>
            ) : (
              <>
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
              </>
            )}
          </View>

          <View style={[styles.section, styles.sectionBorder]}>
            <RNText style={styles.sectionTitle}>{t('account.preferencesModal.permissions')}</RNText>
            <FieldLabel text={t('account.preferencesModal.appPermissions')} />
            {/* Los permisos los concede el sistema operativo: la app solo puede llevar
                al usuario a esa pantalla, no alternarlos desde acá. */}
            <ActionRow
              label={t('account.preferencesModal.openSystemSettings')}
              onPress={handleOpenSystemSettings}
            />
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
      </GlassFullScreenModal>
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
    <ChevronDown size={20} color={themeColors.glass.textSoft} />
  </TouchableOpacity>
);

const ActionRow: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => (
  <TouchableOpacity style={styles.pillRow} onPress={onPress} activeOpacity={0.85}>
    <RNText style={styles.pillValue}>{label}</RNText>
    <ChevronRight size={16} color={themeColors.glass.textSoft} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 24,
  },
  section: {
    gap: 8,
    width: '100%',
  },
  sectionBorder: {
    borderTopWidth: 1,
    borderTopColor: themeColors.glass.border,
    paddingTop: 24,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 18,
    color: themeColors.glass.text,
    letterSpacing: 0.07,
    marginBottom: 8,
    includeFontPadding: false,
  },
  fieldLabel: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 10,
    lineHeight: 18,
    color: themeColors.glass.text,
    letterSpacing: 0.05,
    includeFontPadding: false,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    borderRadius: 1000,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: themeColors.glass.inputBg,
    gap: 12,
    minHeight: 56,
  },
  pillValue: {
    flex: 1,
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.text,
    letterSpacing: 0.07,
    includeFontPadding: false,
  },
  pathPreview: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 18,
    color: themeColors.glass.textSoft,
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
    width: '100%',
    paddingHorizontal: 24,
  },
  saveBtn: {
    width: '100%',
    height: 40,
    borderRadius: 1000,
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  saveBtnDisabled: {
    opacity: themeColors.disabledOpacity,
  },
  saveBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.text,
    includeFontPadding: false,
  },
  cancelText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.gold,
    includeFontPadding: false,
  },
});
