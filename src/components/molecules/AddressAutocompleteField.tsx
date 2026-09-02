/**
 * Campo Dirección con sugerencias inline (Geoapify vía platform).
 *
 * No es un Modal: la lista vive en el mismo árbol que el form. Un Modal nativo
 * acá, encima de GlassFullScreenModal, deja una capa huérfana en iOS.
 *
 * Si el proxy está caído, sin cuota o sin key, no muestra nada y el campo
 * sigue siendo texto libre.
 *
 * Solo consulta si `value` coincide con el último texto tipeado: abrir
 * edición con una dirección cargada o rellenar por GPS no dispara la lista.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppTextInput } from '../atoms/AppTextInput';
import { useKeyboardAwareScroll } from '../atoms/KeyboardDismissScrollView/keyboardAwareScrollContext';
import { FONT_FAMILY } from '../../theme/typography';
import { themeColors } from '../../theme/colors';
import { storage } from '../../utils/storage';
import {
  autocompleteAddress,
  type AddressSuggestion,
} from '../../api/platformApi';

export const ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 3;

const GEOAPIFY_URL = 'https://www.geoapify.com/';
const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';

export interface AddressAutocompleteFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  /** ISO 3166-1 alpha-2, uno o varios separados por coma. */
  countryCode?: string | null;
  onSelectSuggestion: (suggestion: AddressSuggestion) => void;
}

export const AddressAutocompleteField: React.FC<AddressAutocompleteFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  countryCode,
  onSelectSuggestion,
}) => {
  const { t, i18n } = useTranslation();
  const keyboardScroll = useKeyboardAwareScroll();
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const lastTypedQueryRef = useRef<string | null>(null);
  const suggestionsWrapRef = useRef<View>(null);

  useEffect(() => {
    const q = value.trim();
    const lastTyped = lastTypedQueryRef.current;
    if (lastTyped === null || q !== lastTyped.trim() || q.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const token = await storage.getAccessToken();
          if (!token || ac.signal.aborted) {
            if (!ac.signal.aborted) setLoading(false);
            return;
          }
          const lang = (i18n.language || 'es').slice(0, 2);
          const res = await autocompleteAddress(token, q, {
            countryCode,
            signal: ac.signal,
            lang,
          });
          if (ac.signal.aborted) return;
          setSuggestions(res.status === 'ok' ? res.suggestions : []);
        } catch (err) {
          if (ac.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
            return;
          }
          setSuggestions([]);
        } finally {
          if (!ac.signal.aborted) setLoading(false);
        }
      })();
    }, ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [value, countryCode, i18n.language]);

  const handleChange = (next: string) => {
    lastTypedQueryRef.current = next;
    onChangeText(next);
  };

  const handleSelect = (suggestion: AddressSuggestion) => {
    lastTypedQueryRef.current = null;
    setSuggestions([]);
    onSelectSuggestion(suggestion);
  };

  const openUrl = (url: string) => {
    void Linking.openURL(url);
  };

  return (
    <View style={styles.field}>
      <RNText style={styles.fieldLabel}>{label}</RNText>
      <View style={styles.fieldInputWrap}>
        <AppTextInput
          value={value}
          onChangeText={handleChange}
          style={styles.fieldInput}
          placeholder={placeholder}
          placeholderTextColor={themeColors.glass.placeholder}
          autoCorrect={false}
          autoCapitalize="words"
          accessibilityLabel={label}
          accessibilityHint={t('account.shippingAddress.addressSearchHint')}
        />
        {loading ? (
          <ActivityIndicator size="small" color={themeColors.glass.textSoft} />
        ) : null}
      </View>

      {suggestions.length > 0 ? (
        <View
          ref={suggestionsWrapRef}
          style={styles.suggestions}
          accessibilityRole="list"
          accessibilityLabel={t('account.shippingAddress.suggestionsLabel')}
          onLayout={() => {
            requestAnimationFrame(() => {
              keyboardScroll?.ensureNodeVisible(suggestionsWrapRef.current);
            });
          }}
        >
          {suggestions.map((item, index) => {
            const title = item.formatted.trim() || item.address_line.trim();
            if (!title) return null;
            return (
              <TouchableOpacity
                key={`${item.formatted}-${index}`}
                style={[
                  styles.suggestionRow,
                  index === suggestions.length - 1 && styles.suggestionRowLast,
                ]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={title}
              >
                <RNText style={styles.suggestionTitle} numberOfLines={2}>
                  {title}
                </RNText>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      <View style={styles.attribution}>
        <TouchableOpacity
          onPress={() => openUrl(GEOAPIFY_URL)}
          accessibilityRole="link"
          accessibilityLabel="Powered by Geoapify"
          accessibilityHint={t('account.shippingAddress.attributionA11y')}
          hitSlop={6}
        >
          <RNText style={styles.attributionLink}>Powered by Geoapify</RNText>
        </TouchableOpacity>
        <RNText style={styles.attributionSep}> · </RNText>
        <TouchableOpacity
          onPress={() => openUrl(OSM_COPYRIGHT_URL)}
          accessibilityRole="link"
          accessibilityLabel="OpenStreetMap contributors"
          hitSlop={6}
        >
          <RNText style={styles.attributionLink}>© OpenStreetMap contributors</RNText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  fieldInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    borderRadius: 1000,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: themeColors.glass.inputBg,
    gap: 8,
  },
  fieldInput: {
    flex: 1,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 20,
    color: themeColors.glass.text,
    letterSpacing: 0.06,
    padding: 0,
    margin: 0,
    includeFontPadding: false,
  },
  suggestions: {
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    borderRadius: 16,
    backgroundColor: themeColors.glass.inputBg,
    overflow: 'hidden',
  },
  suggestionRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: themeColors.glass.border,
  },
  suggestionRowLast: {
    borderBottomWidth: 0,
  },
  suggestionTitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 18,
    color: themeColors.glass.text,
    includeFontPadding: false,
  },
  attribution: {
    paddingHorizontal: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  attributionSep: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    lineHeight: 14,
    color: themeColors.glass.textMuted,
    includeFontPadding: false,
  },
  attributionLink: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 10,
    lineHeight: 14,
    color: themeColors.glass.textSoft,
    textDecorationLine: 'underline',
    includeFontPadding: false,
  },
});
