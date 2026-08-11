/**
 * Selector de una opción — bottom sheet glass compartido.
 *
 * Reemplaza los tres pickers blancos que se abrían sobre modales oscuros (tema e idioma
 * en Preferencias, país en Dirección de envío y en CountrySelect): mismo panel, mismo
 * header y mismo cierre tocando el fondo que el resto de los drawers.
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  FlatList,
} from 'react-native';
import { AppTextInput } from '../atoms/AppTextInput';
import { Check, Search } from 'lucide-react-native';
import { StreamBottomSheet, streamBottomPanelStyle } from '../organisms/stream/StreamBottomSheet';
import { FONT_FAMILY } from '../../theme/typography';
import { themeColors } from '../../theme/colors';

/** A partir de acá la lista scrollea con altura fija en vez de ajustarse al contenido. */
const SCROLLABLE_THRESHOLD = 7;

export interface AppOptionPickerOption {
  key: string;
  label: string;
  /** Texto secundario a la derecha (p. ej. prefijo telefónico). */
  hint?: string;
  selected?: boolean;
}

export interface AppOptionPickerSheetProps {
  visible: boolean;
  title: string;
  options: AppOptionPickerOption[];
  onSelect: (key: string) => void;
  onClose: () => void;
  /** Si viene, se muestra un buscador sobre la lista. */
  searchPlaceholder?: string;
  emptyLabel?: string;
  /**
   * Monta el picker en su propio Modal nativo. Por defecto sí, que es lo correcto cuando
   * se abre desde una pantalla común.
   *
   * Ponerlo en `false` cuando se abre desde otro modal ya presentado (p. ej. vía el slot
   * `overlay` de GlassFullScreenModal): en iOS un view controller no puede presentar un
   * segundo Modal mientras ya está presentando uno, y el picker no aparecería.
   */
  nativeModal?: boolean;
}

export const AppOptionPickerSheet: React.FC<AppOptionPickerSheetProps> = ({
  visible,
  title,
  options,
  onSelect,
  onClose,
  searchPlaceholder,
  emptyLabel,
  nativeModal = true,
}) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q)
    );
  }, [options, query]);

  const scrollable = searchPlaceholder != null || options.length >= SCROLLABLE_THRESHOLD;

  const handleSelect = (key: string) => {
    setQuery('');
    onSelect(key);
  };

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  return (
    <StreamBottomSheet
      visible={visible}
      nativeModal={nativeModal}
      title={title}
      onClose={handleClose}
      panelStyle={[streamBottomPanelStyle, scrollable ? styles.panelTall : null]}
      fillToMaxHeight={scrollable}
      scrollEnabled={!scrollable}
      contentContainerStyle={scrollable ? styles.contentFill : undefined}
    >
      {searchPlaceholder ? (
        <View style={styles.searchRow}>
          <Search size={18} color={themeColors.glass.placeholder} />
          <AppTextInput
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={themeColors.glass.placeholder}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      ) : null}

      {scrollable ? (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.key}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <OptionRow option={item} onPress={handleSelect} />}
          ListEmptyComponent={
            emptyLabel ? <RNText style={styles.empty}>{emptyLabel}</RNText> : null
          }
        />
      ) : (
        <View style={styles.staticList}>
          {filtered.map((item) => (
            <OptionRow key={item.key} option={item} onPress={handleSelect} />
          ))}
        </View>
      )}
    </StreamBottomSheet>
  );
};

const OptionRow: React.FC<{
  option: AppOptionPickerOption;
  onPress: (key: string) => void;
}> = ({ option, onPress }) => (
  <TouchableOpacity
    style={[styles.row, option.selected && styles.rowSelected]}
    onPress={() => onPress(option.key)}
    activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityState={{ selected: !!option.selected }}
  >
    <RNText style={styles.rowLabel} numberOfLines={1}>
      {option.label}
    </RNText>
    {option.hint ? <RNText style={styles.rowHint}>{option.hint}</RNText> : null}
    {option.selected ? <Check size={20} color={themeColors.primary} /> : null}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  panelTall: {
    maxHeight: '70%',
  },
  contentFill: {
    flex: 1,
    minHeight: 0,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    borderRadius: 1000,
    paddingHorizontal: 16,
    minHeight: 48,
    backgroundColor: themeColors.glass.inputBg,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: themeColors.glass.text,
    padding: 0,
    includeFontPadding: false,
  },
  list: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    paddingBottom: 8,
  },
  staticList: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: 1000,
  },
  rowSelected: {
    backgroundColor: themeColors.glass.inputBg,
  },
  rowLabel: {
    flex: 1,
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.text,
    includeFontPadding: false,
  },
  rowHint: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: themeColors.glass.textMuted,
    includeFontPadding: false,
  },
  empty: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: themeColors.glass.textSoft,
    textAlign: 'center',
    paddingVertical: 24,
    includeFontPadding: false,
  },
});
