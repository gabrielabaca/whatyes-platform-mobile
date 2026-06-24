/**
 * Cambiar contraseña — Figma 536-22973 / 22994 / 23020
 * 3 pasos: email (readonly) → código → nueva contraseña (sin contraseña anterior).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Text as RNText,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Eye, EyeOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GlassFullScreenModal,
  type GlassFullScreenModalHandle,
} from '../profile/GlassFullScreenModal';
import { FONT_FAMILY } from '../../../theme/typography';
import { passwordMeetsPolicy } from '../../../utils/formValidation';
import {
  changePasswordConfirm,
  changePasswordRequestCode,
  changePasswordVerifyCode,
  ApiError,
} from '../../../api/authApi';

const PRIMARY = '#685CF0';
const CANCEL_GOLD = '#FDC700';
const ERROR_RED = '#FB2C36';
const OTP_LENGTH = 4;
const RESEND_COOLDOWN_SEC = 60;

type Step = 'email' | 'code' | 'password';

export interface ChangePasswordModalProps {
  visible: boolean;
  userEmail: string;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  visible,
  userEmail,
  onClose,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const modalRef = useRef<GlassFullScreenModalHandle>(null);
  const otpInputRef = useRef<TextInput>(null);

  const [step, setStep] = useState<Step>('email');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);

  const resetState = useCallback(() => {
    setStep('email');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setCodeError(null);
    setPasswordError(null);
    setConfirmError(null);
    setResendSecondsLeft(0);
    setLoading(false);
  }, []);

  const startResendCooldown = useCallback(() => {
    setResendSecondsLeft(RESEND_COOLDOWN_SEC);
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }
    resetState();
  }, [visible, resetState]);

  useEffect(() => {
    if (resendSecondsLeft <= 0) {
      return;
    }
    const id = setInterval(() => {
      setResendSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [resendSecondsLeft]);

  const handleClose = () => {
    if (loading) {
      return;
    }
    modalRef.current?.dismiss();
  };

  const handleSendCode = async () => {
    if (!userEmail.trim() || loading) {
      return;
    }
    setLoading(true);
    setCodeError(null);
    try {
      await changePasswordRequestCode();
      startResendCooldown();
      setStep('code');
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : t('account.changePasswordModal.sendCodeError');
      Alert.alert(t('common.error'), msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendSecondsLeft > 0 || loading) {
      return;
    }
    setLoading(true);
    setCodeError(null);
    try {
      await changePasswordRequestCode();
      setCode('');
      startResendCooldown();
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : t('account.changePasswordModal.sendCodeError');
      Alert.alert(t('common.error'), msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.trim().length !== OTP_LENGTH || loading) {
      return;
    }
    setLoading(true);
    setCodeError(null);
    try {
      await changePasswordVerifyCode(code.trim());
      setStep('password');
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : t('account.changePasswordModal.invalidCode');
      setCodeError(msg);
      startResendCooldown();
    } finally {
      setLoading(false);
    }
  };

  const handleSavePassword = async () => {
    setPasswordError(null);
    setConfirmError(null);

    if (!passwordMeetsPolicy(newPassword)) {
      setPasswordError(t('register.passwordPolicyError'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setConfirmError(t('account.changePasswordModal.passwordsMismatch'));
      return;
    }

    setLoading(true);
    try {
      await changePasswordConfirm({
        code: code.trim(),
        new_password: newPassword,
      });
      Alert.alert(
        t('account.changePasswordModal.successTitle'),
        t('account.changePasswordModal.successBody'),
        [{ text: t('common.ok'), onPress: handleClose }]
      );
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : t('account.changePasswordModal.saveError');
      Alert.alert(t('common.error'), msg);
    } finally {
      setLoading(false);
    }
  };

  const codeDigits = code.slice(0, OTP_LENGTH).split('');
  const activeOtpIndex = Math.min(codeDigits.length, OTP_LENGTH - 1);
  const canVerifyCode = code.length === OTP_LENGTH && !loading;
  const canSavePassword =
    newPassword.length > 0 && confirmPassword.length > 0 && !loading;

  const titleKey =
    step === 'email'
      ? 'account.changePasswordModal.titleEmail'
      : step === 'code'
        ? 'account.changePasswordModal.titleCode'
        : 'account.changePasswordModal.titlePassword';

  const subtitleKey =
    step === 'email'
      ? 'account.changePasswordModal.subtitleEmail'
      : step === 'code'
        ? 'account.changePasswordModal.subtitleCode'
        : 'account.changePasswordModal.subtitlePassword';

  const renderPrimaryButton = (
    label: string,
    onPress: () => void,
    disabled: boolean
  ) => (
    <TouchableOpacity
      style={[styles.primaryBtn, disabled && styles.primaryBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.88}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <RNText style={styles.primaryBtnText}>{label}</RNText>
      )}
    </TouchableOpacity>
  );

  const renderSecondaryAction = (label: string, onPress: () => void) => (
    <TouchableOpacity onPress={onPress} hitSlop={12} disabled={loading} activeOpacity={0.75}>
      <RNText style={styles.secondaryActionText}>{label}</RNText>
    </TouchableOpacity>
  );

  return (
    <GlassFullScreenModal
      ref={modalRef}
      visible={visible}
      onClose={onClose}
      backdropDelayMs={400}
      backdropAccessibilityLabel={t('account.changePasswordModal.cancel')}
      containerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
      scrollStyle={styles.contentScroll}
      contentContainerStyle={styles.contentScrollInner}
      header={
        <View style={styles.header}>
          <RNText style={styles.title}>{t(titleKey)}</RNText>
          <TouchableOpacity onPress={handleClose} hitSlop={12} disabled={loading}>
            <X size={22} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      }
      subHeader={
        <RNText style={styles.subtitle}>
          {step === 'code'
            ? t(subtitleKey, { email: userEmail })
            : t(subtitleKey)}
        </RNText>
      }
      footer={
        <View style={styles.footer}>
          {step === 'email'
            ? renderPrimaryButton(
                t('account.changePasswordModal.sendCode'),
                handleSendCode,
                loading
              )
            : null}
          {step === 'code'
            ? renderPrimaryButton(
                t('account.changePasswordModal.verifyCode'),
                handleVerifyCode,
                !canVerifyCode
              )
            : null}
          {step === 'password'
            ? renderPrimaryButton(
                t('account.changePasswordModal.save'),
                handleSavePassword,
                !canSavePassword
              )
            : null}

          {step === 'code' ? (
            <View style={styles.resendRow}>
              <RNText style={styles.resendHint}>
                {t('account.changePasswordModal.noCodeReceived')}{' '}
              </RNText>
              {resendSecondsLeft > 0 ? (
                <RNText style={styles.resendCooldown}>
                  {t('account.changePasswordModal.resendIn', {
                    seconds: resendSecondsLeft,
                  })}
                </RNText>
              ) : (
                <TouchableOpacity
                  onPress={handleResendCode}
                  disabled={loading}
                  hitSlop={8}
                >
                  <RNText style={styles.resendLink}>
                    {t('account.changePasswordModal.resendCode')}
                  </RNText>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {step === 'email' || step === 'code'
            ? renderSecondaryAction(
                t('account.changePasswordModal.tryAnotherWay'),
                handleClose
              )
            : renderSecondaryAction(
                t('account.changePasswordModal.cancel'),
                handleClose
              )}
        </View>
      }
    >
              {step === 'email' ? (
                <View style={styles.fieldGroup}>
                  <RNText style={styles.fieldLabel}>
                    {t('account.changePasswordModal.emailLabel')}
                  </RNText>
                  <View style={[styles.inputWrap, styles.inputReadonly]}>
                    <RNText style={styles.readonlyText}>{userEmail}</RNText>
                  </View>
                </View>
              ) : null}

              {step === 'code' ? (
                <View style={styles.fieldGroup}>
                  <RNText style={styles.fieldLabel}>
                    {t('account.changePasswordModal.emailLabel')}
                  </RNText>
                  <View style={[styles.inputWrap, styles.inputReadonly]}>
                    <RNText style={styles.readonlyText}>{userEmail}</RNText>
                  </View>
                  <RNText style={styles.fieldLabel}>
                    {t('account.changePasswordModal.codeLabel')}
                  </RNText>
                  <View style={styles.otpRow}>
                    <TextInput
                      ref={otpInputRef}
                      value={code}
                      onChangeText={(value) => {
                        setCode(value.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH));
                        if (codeError) {
                          setCodeError(null);
                        }
                      }}
                      keyboardType="number-pad"
                      maxLength={OTP_LENGTH}
                      style={styles.hiddenOtpInput}
                      autoFocus
                    />
                    {Array.from({ length: OTP_LENGTH }, (_, index) => index).map(
                      (index) => {
                        const hasValue = !!codeDigits[index];
                        const isActive =
                          index === activeOtpIndex && codeDigits.length < OTP_LENGTH;
                        return (
                          <TouchableOpacity
                            key={index}
                            activeOpacity={1}
                            onPress={() => otpInputRef.current?.focus()}
                            style={[
                              styles.otpSlot,
                              isActive && styles.otpSlotActive,
                              codeError ? styles.otpSlotError : null,
                            ]}
                          >
                            <RNText style={styles.otpDigit}>
                              {hasValue ? codeDigits[index] : '_'}
                            </RNText>
                          </TouchableOpacity>
                        );
                      }
                    )}
                  </View>
                  {codeError ? (
                    <RNText style={styles.errorText}>{codeError}</RNText>
                  ) : null}
                </View>
              ) : null}

              {step === 'password' ? (
                <View style={styles.fieldGroup}>
                  <RNText style={styles.fieldLabel}>
                    {t('account.changePasswordModal.newPassword')}
                  </RNText>
                  <View style={styles.passwordWrap}>
                    <TextInput
                      value={newPassword}
                      onChangeText={(v) => {
                        setNewPassword(v);
                        if (passwordError) {
                          setPasswordError(null);
                        }
                      }}
                      placeholder={t('account.changePasswordModal.passwordPlaceholder')}
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      style={styles.input}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword((v) => !v)}
                      hitSlop={8}
                      style={styles.eyeBtn}
                    >
                      {showNewPassword ? (
                        <EyeOff size={20} color="rgba(255,255,255,0.7)" />
                      ) : (
                        <Eye size={20} color="rgba(255,255,255,0.7)" />
                      )}
                    </TouchableOpacity>
                  </View>
                  {passwordError ? (
                    <RNText style={styles.errorText}>{passwordError}</RNText>
                  ) : null}
                  <RNText style={styles.fieldLabel}>
                    {t('account.changePasswordModal.confirmPassword')}
                  </RNText>
                  <View style={styles.passwordWrap}>
                    <TextInput
                      value={confirmPassword}
                      onChangeText={(v) => {
                        setConfirmPassword(v);
                        if (confirmError) {
                          setConfirmError(null);
                        }
                      }}
                      placeholder={t('account.changePasswordModal.passwordPlaceholder')}
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      style={styles.input}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword((v) => !v)}
                      hitSlop={8}
                      style={styles.eyeBtn}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={20} color="rgba(255,255,255,0.7)" />
                      ) : (
                        <Eye size={20} color="rgba(255,255,255,0.7)" />
                      )}
                    </TouchableOpacity>
                  </View>
                  {confirmError ? (
                    <RNText style={styles.errorText}>{confirmError}</RNText>
                  ) : null}
                </View>
              ) : null}
    </GlassFullScreenModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollInner: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  fieldGroup: {
    gap: 8,
  },
  footer: {
    gap: 24,
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    flex: 1,
    includeFontPadding: false,
  },
  subtitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#E4E1E1',
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
  inputWrap: {
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: 'rgba(236, 235, 235, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputReadonly: {
    opacity: 0.85,
  },
  readonlyText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 20,
    color: '#FFFFFF',
    letterSpacing: 0.06,
    includeFontPadding: false,
  },
  input: {
    flex: 1,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: '#FFFFFF',
    padding: 0,
    includeFontPadding: false,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: 'rgba(236, 235, 235, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  eyeBtn: {
    marginLeft: 8,
  },
  hiddenOtpInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 18,
    position: 'relative',
  },
  otpSlot: {
    width: 51,
    height: 52,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpSlotActive: {
    borderColor: '#49A9E1',
  },
  otpSlotError: {
    borderColor: ERROR_RED,
  },
  otpDigit: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  errorText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 18,
    color: ERROR_RED,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 1000,
    height: 40,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  secondaryActionText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: CANCEL_GOLD,
    textAlign: 'center',
    includeFontPadding: false,
  },
  resendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendHint: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  resendLink: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: PRIMARY,
  },
  resendCooldown: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
});
