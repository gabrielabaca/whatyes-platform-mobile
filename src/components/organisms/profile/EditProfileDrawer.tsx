/**
 * Drawer editar perfil — Figma 536-22799
 * Overlay con blur + tint rgba(2,5,15,0.4)
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Text as RNText,
  ActivityIndicator,
} from 'react-native';
import { AppTextInput } from '../../atoms/AppTextInput';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import {
  GlassFullScreenModal,
  type GlassFullScreenModalHandle,
} from './GlassFullScreenModal';
import { GlassModalHeader } from './GlassModalHeader';
import { useTranslation } from 'react-i18next';
import { Camera } from 'lucide-react-native';
import { launchPhotoLibraryNow } from '../../../utils/mediaPicker';
import { deferMediaPicker } from '../../../utils/deferMediaPicker';
import { IconUser } from '../../icons';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { updateOwnProfile, type UserPublicProfile } from '../../../api/profileApi';
import { appAlert } from '../../../alerts';
import { useAuth } from '../../../hooks/useAuth';
import {
  BIO_EDIT_MAX_GRAPHEMES,
  clampToGraphemes,
  graphemeCount,
} from '../../../utils/grapheme';

const COVER_H = 164;

export interface EditProfileDrawerProps {
  visible: boolean;
  profile: UserPublicProfile;
  coverUri?: string | null;
  avatarUri?: string | null;
  onClose: () => void;
  onSaved?: () => void;
}

export const EditProfileDrawer: React.FC<EditProfileDrawerProps> = ({
  visible,
  profile,
  coverUri,
  avatarUri: initialAvatarUri,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const modalRef = useRef<GlassFullScreenModalHandle>(null);
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? '');
  const emailLabel = user?.email ?? '';
  const [avatarUri, setAvatarUri] = useState(initialAvatarUri);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setDisplayName(profile.display_name);
      setBio(clampToGraphemes(profile.bio ?? '', BIO_EDIT_MAX_GRAPHEMES));
      setAvatarUri(initialAvatarUri);
    }
  }, [visible, profile, initialAvatarUri]);

  const handleClose = () => {
    modalRef.current?.dismiss();
  };

  const pickAvatar = () => {
    deferMediaPicker(() => {
      launchPhotoLibraryNow({ mediaType: 'photo' }, (response) => {
        const uri = response.assets?.[0]?.uri;
        if (uri) {
          setAvatarUri(uri);
        }
      });
    });
  };

  // TODO: subir `avatarUri` al guardar — falta el endpoint de avatar en service-users.
  const handleSave = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      appAlert(t('common.appName'), t('profile.editNameRequired'));
      return;
    }
    setSaving(true);
    try {
      await updateOwnProfile({
        name: trimmedName,
        bio: bio.trim() || null,
      });
      onSaved?.();
      handleClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('profile.editSaveError');
      appAlert(t('common.appName'), msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassFullScreenModal
      ref={modalRef}
      visible={visible}
      onClose={onClose}
      backdropAccessibilityLabel={t('profile.editCancel')}
      dismissOnBackdropPress={false}
      contentContainerStyle={styles.scrollContent}
      header={
        <GlassModalHeader
          title={t('profile.editProfile')}
          onClose={handleClose}
          closeDisabled={saving}
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
            {saving ? (
              <ActivityIndicator color={themeColors.glass.text} />
            ) : (
              <RNText style={styles.saveBtnText}>{t('profile.editSave')}</RNText>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} hitSlop={12}>
            <RNText style={styles.cancelText}>{t('profile.editCancel')}</RNText>
          </TouchableOpacity>
        </View>
      }
    >
            <View style={[styles.coverWrap, { height: COVER_H }]}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
              ) : (
                <View style={[styles.coverImage, styles.coverFallback]} />
              )}
              <CoverGradient />
              <View style={[styles.coverInner, styles.coverInnerPadBottom]}>
                <View style={styles.avatarRow}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <IconUser size={28} color="#02050F" strokeWidth={2} />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.cameraBtn}
                    onPress={pickAvatar}
                    accessibilityRole="button"
                  >
                    <Camera size={22} color={themeColors.glass.text} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.form}>
              <EditField
                label={t('profile.editName')}
                value={displayName}
                onChangeText={setDisplayName}
              />
              <ReadOnlyField label={t('profile.editEmail')} value={emailLabel} />
              <EditField
                label={t('profile.editBio')}
                value={bio}
                onChangeText={(v) => setBio(clampToGraphemes(v, BIO_EDIT_MAX_GRAPHEMES))}
                multiline
                inputStyle={styles.bioInput}
                hint={`${graphemeCount(bio)}/${BIO_EDIT_MAX_GRAPHEMES}`}
              />

            </View>
    </GlassFullScreenModal>
  );
};

const ReadOnlyField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.field}>
    <RNText style={styles.fieldLabel}>{label}</RNText>
    <View style={[styles.fieldInputWrap, styles.fieldInputReadOnly]}>
      <RNText style={styles.readOnlyValue} numberOfLines={1}>
        {value}
      </RNText>
    </View>
  </View>
);

const EditField: React.FC<{
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  inputStyle?: object;
  hint?: string;
}> = ({ label, value, onChangeText, multiline, inputStyle, hint }) => (
  <View style={styles.field}>
    <RNText style={styles.fieldLabel}>{label}</RNText>
    <View style={[styles.fieldInputWrap, multiline && styles.fieldInputWrapMultiline]}>
      <AppTextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.fieldInput, inputStyle]}
        placeholderTextColor={themeColors.glass.placeholder}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
    {hint ? <RNText style={styles.fieldHint}>{hint}</RNText> : null}
  </View>
);

const CoverGradient: React.FC = () => (
  <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
    <Defs>
      <LinearGradient id="edit-cover-grad" x1="0" y1="1" x2="0" y2="0">
        <Stop offset="0" stopColor="rgba(0,0,0,0.9)" />
        <Stop offset="0.5" stopColor="rgba(0,0,0,0.2)" />
        <Stop offset="1" stopColor="rgba(0,0,0,0)" />
      </LinearGradient>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#edit-cover-grad)" />
  </Svg>
);

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    gap: 24,
    paddingBottom: 16,
  },
  coverWrap: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#CBCEFF',
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
  },
  coverFallback: {
    backgroundColor: '#E7E7FF',
  },
  coverInner: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: 'flex-end',
    zIndex: 2,
  },
  coverInnerPadBottom: {
    paddingBottom: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.402,
    borderColor: '#3F3F47',
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.402,
    borderColor: '#3F3F47',
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 16,
  },
  field: {
    gap: 8,
    width: '100%',
  },
  fieldLabel: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 10,
    lineHeight: 18,
    color: themeColors.glass.text,
    letterSpacing: 0.05,
    includeFontPadding: false,
  },
  fieldHint: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    lineHeight: 18,
    color: themeColors.glass.textSoft,
    includeFontPadding: false,
    textAlign: 'right',
  },
  fieldInputWrap: {
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    borderRadius: 1000,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: themeColors.glass.inputBg,
  },
  fieldInputWrapMultiline: {
    borderRadius: 12,
    minHeight: 165,
    alignItems: 'flex-start',
  },
  fieldInputReadOnly: {
    opacity: 0.85,
  },
  readOnlyValue: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 20,
    color: themeColors.glass.textSoft,
    letterSpacing: 0.06,
    width: '100%',
    includeFontPadding: false,
  },
  fieldInput: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 20,
    color: themeColors.glass.text,
    letterSpacing: 0.06,
    width: '100%',
    padding: 0,
    margin: 0,
    includeFontPadding: false,
  },
  bioInput: {
    minHeight: 120,
    textAlignVertical: 'top',
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
