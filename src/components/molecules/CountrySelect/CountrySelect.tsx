/**
 * Country Select Component
 * Selector de países con banderas
 */

import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../../atoms/Text';
import { ChevronDown } from 'lucide-react-native';
import { AppOptionPickerSheet } from '../AppOptionPickerSheet';

export interface Country {
  code: string;
  name: string;
  flag: string;
}

// Lista de países comunes con sus banderas (emojis)
export const COUNTRIES: Country[] = [
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺' },
  { code: 'DO', name: 'República Dominicana', flag: '🇩🇴' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳' },
  { code: 'MX', name: 'México', flag: '🇲🇽' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮' },
  { code: 'PA', name: 'Panamá', flag: '🇵🇦' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪' },
  { code: 'PR', name: 'Puerto Rico', flag: '🇵🇷' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'CA', name: 'Canadá', flag: '🇨🇦' },
  { code: 'ES', name: 'España', flag: '🇪🇸' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷' },
  { code: 'DE', name: 'Alemania', flag: '🇩🇪' },
  { code: 'IT', name: 'Italia', flag: '🇮🇹' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'JP', name: 'Japón', flag: '🇯🇵' },
  { code: 'KR', name: 'Corea del Sur', flag: '🇰🇷' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'NZ', name: 'Nueva Zelanda', flag: '🇳🇿' },
];

/** Unión de ISO2 de COUNTRIES para filtrar Geoapify cuando el form no eligió país. */
export const COUNTRY_CODES_FILTER = COUNTRIES.map((c) => c.code).join(',');

interface CountrySelectProps {
  label?: string;
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  containerClassName?: string;
  /** Oculta label interno (p. ej. si el padre ya muestra fieldLabel). */
  hideLabel?: boolean;
  /** `pillDark`: trigger estilo wizard Start Live sobre fondo oscuro. */
  variant?: 'default' | 'pillDark';
  modalTitle?: string;
  searchPlaceholder?: string;
  /** Ver la nota junto al `AppOptionPickerSheet` de abajo antes de ponerlo en `false`. */
  nativeModal?: boolean;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
  label,
  value,
  onValueChange,
  placeholder = 'Seleccionar país',
  containerClassName = '',
  hideLabel = false,
  variant = 'default',
  modalTitle = 'Seleccionar país',
  searchPlaceholder = 'Buscar país...',
  nativeModal = true,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const selectedCountry = COUNTRIES.find((country) => country.code === value || country.name === value);

  const handleSelectCountry = (code: string) => {
    const picked = COUNTRIES.find((country) => country.code === code);
    if (picked) {
      onValueChange(picked.name);
    }
    setIsModalVisible(false);
  };

  const isPillDark = variant === 'pillDark';

  return (
    <View className={containerClassName}>
      {label && !hideLabel ? (
        isPillDark ? (
          <Text style={styles.pillFieldLabel}>{label}</Text>
        ) : (
          <Text variant="label" className="mb-2">
            {label}
          </Text>
        )
      ) : null}

      <TouchableOpacity
        style={[styles.selectButton, isPillDark && styles.selectButtonPillDark]}
        onPress={() => setIsModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.selectContent}>
          {selectedCountry ? (
            <>
              <Text style={styles.flag}>{selectedCountry.flag}</Text>
              <Text style={[styles.selectText, isPillDark && styles.selectTextPillDark]}>
                {selectedCountry.name}
              </Text>
            </>
          ) : (
            <Text style={[styles.placeholderText, isPillDark && styles.placeholderTextPillDark]}>
              {placeholder}
            </Text>
          )}
        </View>
        <ChevronDown size={20} color={isPillDark ? '#FFFFFF' : '#6b7280'} />
      </TouchableOpacity>

      {/**
       * OJO al reusar este componente dentro de un modal: el picker se monta como Modal
       * nativo y en iOS un view controller no presenta un segundo modal mientras ya está
       * presentando uno — el desplegable no abriría, sin error. En ese caso hay que pasarle
       * `nativeModal={false}` y montarlo en el slot `overlay` del modal padre, como hacen
       * PreferencesModal y ShippingAddressModal.
       *
       * `nativeModal={false}` también sirve cuando el padre ya vive en el portal raíz (no
       * en un Modal nativo): ahí el picker comparte jerarquía con la pantalla de fondo y su
       * glass difumina de verdad, como en los drawers del vivo.
       */}
      <AppOptionPickerSheet
        visible={isModalVisible}
        nativeModal={nativeModal}
        title={modalTitle}
        searchPlaceholder={searchPlaceholder}
        options={COUNTRIES.map((country) => ({
          key: country.code,
          label: `${country.flag}  ${country.name}`,
          selected: selectedCountry?.code === country.code,
        }))}
        onSelect={handleSelectCountry}
        onClose={() => setIsModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  pillFieldLabel: {
    fontSize: 10,
    lineHeight: 18,
    color: '#FFFFFF',
    letterSpacing: 0.05,
    marginBottom: 8,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    minHeight: 48,
  },
  selectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    fontSize: 20,
    marginRight: 8,
  },
  selectText: {
    fontSize: 16,
    color: '#111827',
  },
  placeholderText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  selectButtonPillDark: {
    borderColor: '#DDDDDD',
    borderRadius: 1000,
    backgroundColor: 'rgba(255,255,255,0.08)',
    minHeight: 52,
  },
  selectTextPillDark: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  placeholderTextPillDark: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BABABA',
  },
});
