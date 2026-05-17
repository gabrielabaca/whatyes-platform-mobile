import React from 'react';
import {
  View,
  TouchableOpacity,
  Text as RNText,
  TextInput,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Check, CreditCard, PieChart } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { CountrySelect } from '../../molecules/CountrySelect';
import { startLiveStyles, START_LIVE_COLORS } from './startLiveStyles';

export interface StartLiveFeatureItem {
  title: string;
  body: string;
}

export const StartLiveFeatureRow: React.FC<{
  title: string;
  body: string;
  icon?: 'card' | 'chart';
}> = ({ title, body, icon = 'card' }) => (
  <View style={startLiveStyles.featureRow}>
    <View style={startLiveStyles.featureIconWrap}>
      {icon === 'chart' ? (
        <PieChart size={18} color="#18181B" strokeWidth={2} />
      ) : (
        <CreditCard size={18} color="#18181B" strokeWidth={2} />
      )}
    </View>
    <View style={startLiveStyles.featureTextCol}>
      <RNText style={startLiveStyles.featureTitle}>{title}</RNText>
      <RNText style={startLiveStyles.featureBody}>{body}</RNText>
    </View>
  </View>
);

export const StartLiveFeatureList: React.FC<{ items: StartLiveFeatureItem[] }> = ({ items }) => (
  <View style={startLiveStyles.featureList}>
    {items.map((item) => (
      <StartLiveFeatureRow key={item.title} title={item.title} body={item.body} />
    ))}
  </View>
);

export const StartLivePrimaryButton: React.FC<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}> = ({ label, onPress, disabled, loading, style }) => (
  <TouchableOpacity
    style={[
      startLiveStyles.primaryBtn,
      (disabled || loading) && startLiveStyles.primaryBtnDisabled,
      style,
    ]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.85}
  >
    {loading ? (
      <ActivityIndicator color="#FFFFFF" size="small" />
    ) : (
      <RNText style={startLiveStyles.primaryBtnText}>{label}</RNText>
    )}
  </TouchableOpacity>
);

export const StartLiveRadioRow: React.FC<{
  label: string;
  selected: boolean;
  onPress: () => void;
}> = ({ label, selected, onPress }) => (
  <TouchableOpacity
    style={[startLiveStyles.radioRow, selected && startLiveStyles.radioRowOn]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <View style={startLiveStyles.radioLeft}>
      <View style={startLiveStyles.featureIconWrap}>
        <PieChart size={18} color="#18181B" strokeWidth={2} />
      </View>
      <RNText style={startLiveStyles.radioLabel}>{label}</RNText>
    </View>
    <View style={startLiveStyles.radioOuter}>
      {selected ? <View style={startLiveStyles.radioInner} /> : null}
    </View>
  </TouchableOpacity>
);

export const StartLiveCountryField: React.FC<{
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}> = ({ label, value, onValueChange, placeholder }) => {
  const { t } = useTranslation();
  return (
    <View style={startLiveStyles.field}>
      <RNText style={startLiveStyles.fieldLabel}>{label}</RNText>
      <CountrySelect
        value={value}
        onValueChange={onValueChange}
        placeholder={placeholder ?? t('register.selectCountry')}
        variant="pillDark"
        hideLabel
        modalTitle={t('register.country')}
        searchPlaceholder={t('register.selectCountry')}
      />
    </View>
  );
};

export const StartLivePillField: React.FC<{
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad';
  maxLength?: number;
}> = ({ label, value, onChangeText, placeholder, keyboardType, maxLength }) => (
  <View style={startLiveStyles.field}>
    <RNText style={startLiveStyles.fieldLabel}>{label}</RNText>
    <View style={startLiveStyles.fieldInputWrap}>
      <TextInput
        style={startLiveStyles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={START_LIVE_COLORS.placeholder}
        keyboardType={keyboardType}
        maxLength={maxLength}
      />
    </View>
  </View>
);

export const StartLiveTermsCheckbox: React.FC<{
  checked: boolean;
  label: string;
  onToggle: () => void;
}> = ({ checked, label, onToggle }) => (
  <TouchableOpacity style={startLiveStyles.termsRow} onPress={onToggle} activeOpacity={0.85}>
    <View style={[startLiveStyles.checkbox, checked && startLiveStyles.checkboxOn]}>
      {checked ? <Check size={12} color="#FFFFFF" strokeWidth={3} /> : null}
    </View>
    <RNText style={startLiveStyles.termsText}>{label}</RNText>
  </TouchableOpacity>
);

export const StartLiveConsentNote: React.FC<{ text: string }> = ({ text }) => (
  <View style={startLiveStyles.consentRow}>
    <View style={startLiveStyles.consentCheck}>
      <Check size={8} color="#FFFFFF" strokeWidth={3} />
    </View>
    <RNText style={startLiveStyles.consentText}>{text}</RNText>
  </View>
);
