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
  TextInput,
  Text as RNText,
  Animated,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { GlassBackdrop } from './GlassBackdrop';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera } from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { IconUser } from '../../icons';
import { FONT_FAMILY } from '../../../theme/typography';
import { updateOwnProfile, type UserPublicProfile } from '../../../api/profileApi';

const COVER_H = 164;
const PRIMARY = '#685CF0';
const CANCEL_GOLD = '#FDC700';

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
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(1)).current;
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? '');
  const emailLabel = profile.subtitle ?? '';
  const [avatarUri, setAvatarUri] = useState(initialAvatarUri);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setDisplayName(profile.display_name);
      setBio(profile.bio ?? '');
      setAvatarUri(initialAvatarUri);
      slideAnim.setValue(1);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 68,
        friction: 12,
      }).start();
    }
  }, [visible, profile, initialAvatarUri, slideAnim]);

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

  const pickAvatar = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }
      const uri = response.assets?.[0]?.uri;
      if (uri) {
        setAvatarUri(uri);
      }
    });
  };

  const handleSave = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      Alert.alert(t('common.appName'), t('profile.editNameRequired'));
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
      Alert.alert(t('common.appName'), msg);
    } finally {
      setSaving(false);
    }
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
        accessibilityLabel={t('profile.editCancel')}
      />

      <Animated.View
        style={[styles.sheet, { transform: [{ translateY }], paddingBottom: insets.bottom }]}
        pointerEvents="box-none"
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={[styles.coverWrap, { height: COVER_H }]}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
              ) : (
                <View style={[styles.coverImage, styles.coverFallback]} />
              )}
              <CoverGradient />
              <View
                style={[
                  styles.coverInner,
                  styles.coverInnerPadBottom,
                  { paddingTop: insets.top + 12 },
                ]}
              >
                <RNText style={styles.drawerTitle}>{t('profile.editProfile')}</RNText>
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
                    <Camera size={22} color="#FFFFFF" strokeWidth={2} />
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
                onChangeText={setBio}
                multiline
                inputStyle={styles.bioInput}
              />

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.88}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <RNText style={styles.saveBtnText}>{t('profile.editSave')}</RNText>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={handleClose} hitSlop={12}>
                  <RNText style={styles.cancelText}>{t('profile.editCancel')}</RNText>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.homeIndicator}>
              <View style={styles.homeIndicatorBar} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
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
}> = ({ label, value, onChangeText, multiline, inputStyle }) => (
  <View style={styles.field}>
    <RNText style={styles.fieldLabel}>{label}</RNText>
    <View style={[styles.fieldInputWrap, multiline && styles.fieldInputWrapMultiline]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.fieldInput, inputStyle]}
        placeholderTextColor="rgba(255,255,255,0.5)"
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
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
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    gap: 24,
    paddingBottom: 24,
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
    justifyContent: 'space-between',
    zIndex: 2,
  },
  coverInnerPadBottom: {
    paddingBottom: 16,
  },
  drawerTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
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
    backgroundColor: PRIMARY,
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
    color: '#FFFFFF',
    letterSpacing: 0.05,
    includeFontPadding: false,
  },
  fieldInputWrap: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 1000,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.06,
    width: '100%',
    includeFontPadding: false,
  },
  fieldInput: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 20,
    color: '#FFFFFF',
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
    marginTop: 8,
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
});
