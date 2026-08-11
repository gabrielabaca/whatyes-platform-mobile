/**
 * Notas del vivo — se abren desde el botón comment_bank del rail.
 *
 * Dos presentaciones según el rol:
 * - `mode="edit"` (vendedor): drawer desde la base (Figma 698-13095) con texto libre
 *   sobre el glass (sin caja), link dorado "Pegar notas" y CTA "Publicar".
 * - `mode="read"` (viewer): modal glass CENTRADO, mismo canon que el menú "más" del
 *   vendedor (StreamSellerMoreModal): fade + GlassBackdrop + panel radio 24 con
 *   header título/X; tocar el fondo cierra. Solo muestra la nota publicada.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text as RNText,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import { X } from 'lucide-react-native';
import { AppTextInput } from '../../atoms/AppTextInput';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet, streamBottomPanelStyle, streamSheetStyles } from './StreamBottomSheet';
import { GlassBackdrop, DrawerPanelGlass, DRAWER_PANEL_FALLBACK } from '../profile/GlassBackdrop';
import { drawerPanelGlassKey } from '../../../theme/glassTokens';
import { ROOM_NOTE_MAX_LENGTH } from '../../../api/platformApi';
import { readClipboardText } from '../../../utils/clipboard';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';

const WHITE = themeColors.glass.text;
/** Figma 698:13103: la nota (y su placeholder) van en #D9D9D9. */
const MUTED = themeColors.glass.textMuted;
const SOFT = themeColors.glass.textSoft;

export type StreamLiveNoteDrawerMode = 'edit' | 'read';

export interface StreamLiveNoteDrawerProps {
  visible: boolean;
  onClose: () => void;
  /** Nota publicada; null = el vivo todavía no tiene nota. */
  note: string | null;
  /** 'edit' solo para el vendedor; los viewers siempre 'read'. */
  mode: StreamLiveNoteDrawerMode;
  publishing?: boolean;
  /** Error de la última publicación, ya formateado. */
  error?: string | null;
  onPublish?: (text: string) => void;
}

export const StreamLiveNoteDrawer: React.FC<StreamLiveNoteDrawerProps> = ({
  visible,
  onClose,
  note,
  mode,
  publishing = false,
  error,
  onPublish,
}) => {
  const { t } = useTranslation();
  const isEdit = mode === 'edit';
  /**
   * Borrador local: lo que se escribe no toca la nota publicada hasta "Publicar".
   * Cerrar sin publicar descarta el borrador (por eso se resiembra al abrir).
   */
  const [draft, setDraft] = useState(note ?? '');

  useEffect(() => {
    if (visible) setDraft(note ?? '');
  }, [visible, note]);

  const handlePaste = async () => {
    const clip = await readClipboardText();
    if (!clip.trim()) return;
    setDraft(clip.slice(0, ROOM_NOTE_MAX_LENGTH));
  };

  const trimmedDraft = draft.trim();
  /** Sin cambios respecto de lo publicado no hay nada que publicar. */
  const isDirty = trimmedDraft !== (note ?? '').trim();
  const canPublish = isEdit && isDirty && !publishing;

  if (!isEdit) {
    // Viewer: modal centrado (canon StreamSellerMoreModal), no drawer.
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={styles.readHost}>
          <GlassBackdrop />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          />

          <View
            style={styles.readPanel}
            collapsable={false}
            {...(Platform.OS === 'ios' ? { needsOffscreenAlphaCompositing: true } : null)}
          >
            <DrawerPanelGlass key={drawerPanelGlassKey} />

            <View style={styles.readPanelContent}>
              <View style={styles.readHeader}>
                <RNText style={styles.readTitle} numberOfLines={1}>
                  {t('stream.noteDrawer.title')}
                </RNText>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={12}
                  style={styles.readCloseBtn}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.cancel')}
                >
                  <X size={22} color={WHITE} strokeWidth={2.2} />
                </TouchableOpacity>
              </View>

              {/* La nota puede ser larga (hasta 4000): el cuerpo scrollea dentro del
                  panel, que se ajusta al contenido cuando la nota es corta. */}
              <ScrollView
                style={styles.readScroll}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {note ? (
                  <RNText style={styles.noteBody}>{note}</RNText>
                ) : (
                  <RNText style={styles.emptyBody}>{t('stream.noteDrawer.viewerEmpty')}</RNText>
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('stream.noteDrawer.title')}
      onClose={onClose}
      // Figma 698-13095: panel alto fijo (no hug), la nota arriba y acciones al pie.
      panelStyle={[streamBottomPanelStyle, styles.panel]}
      fillToMaxHeight
      scrollEnabled={false}
      contentContainerStyle={styles.contentEdit}
      // Formulario: un toque al costado del campo no debe descartar lo escrito.
      dismissOnBackdropPress={false}
      footer={
        <View style={styles.footer}>
          {/* Figma 698:13106: link de texto dorado centrado, sin contorno ni icono. */}
          <TouchableOpacity
            onPress={handlePaste}
            hitSlop={12}
            style={styles.pasteWrap}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <RNText style={styles.pasteText}>{t('stream.noteDrawer.paste')}</RNText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[streamSheetStyles.primaryBtn, !canPublish && styles.btnDisabled]}
            onPress={() => onPublish?.(draft)}
            disabled={!canPublish}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            {publishing ? (
              <ActivityIndicator color={WHITE} size="small" />
            ) : (
              <RNText style={streamSheetStyles.primaryBtnText}>
                {t('stream.noteDrawer.publish')}
              </RNText>
            )}
          </TouchableOpacity>
        </View>
      }
    >
      {/* Figma 698:13103: texto libre directo sobre el glass, sin caja ni borde.
          Sin nota, el placeholder son las instrucciones; con nota, el campo trae el
          texto real (blanco) y el placeholder (#D9D9D9) nunca se ve. */}
      <AppTextInput
        style={styles.input}
        value={draft}
        onChangeText={setDraft}
        placeholder={t('stream.noteDrawer.placeholder')}
        placeholderTextColor={MUTED}
        multiline
        textAlignVertical="top"
        maxLength={ROOM_NOTE_MAX_LENGTH}
        editable={!publishing}
        accessibilityLabel={t('stream.noteDrawer.title')}
      />

      {error ? <RNText style={styles.error}>{error}</RNText> : null}
    </StreamBottomSheet>
  );
};

const styles = StyleSheet.create({
  /** Alto del drawer en Figma: 581 de 852 ≈ 68% de la pantalla. */
  panel: {
    maxHeight: '68%',
  },
  contentEdit: {
    flex: 1,
    width: '100%',
  },
  /** Modal centrado del viewer — mismo host/panel que StreamSellerMoreModal. */
  readHost: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  readPanel: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '66%',
    borderRadius: 24,
    overflow: 'hidden',
    // Dentro de un Modal nativo el blur puede no tener nada que difuminar; el
    // color de fallback garantiza que el panel se lea siempre.
    backgroundColor: DRAWER_PANEL_FALLBACK,
  },
  readPanelContent: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 16,
    maxHeight: '100%',
  },
  readHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  readTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: WHITE,
    flex: 1,
    marginRight: 8,
    includeFontPadding: false,
  },
  readCloseBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readScroll: {
    flexGrow: 0,
    width: '100%',
  },
  input: {
    flex: 1,
    padding: 0,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: WHITE,
    includeFontPadding: false,
  },
  noteBody: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
    includeFontPadding: false,
  },
  emptyBody: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 22,
    color: SOFT,
    includeFontPadding: false,
    textAlign: 'center',
    paddingVertical: 24,
  },
  /** Figma 698:13105: "Pegar notas" y "Publicar" separados por 24. */
  footer: {
    width: '100%',
    gap: 24,
    alignItems: 'center',
  },
  pasteWrap: {
    alignItems: 'center',
    width: '100%',
  },
  pasteText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.gold,
    includeFontPadding: false,
    textAlign: 'center',
  },
  btnDisabled: {
    opacity: themeColors.disabledOpacity,
  },
  error: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 18,
    color: themeColors.danger,
    includeFontPadding: false,
    paddingTop: 8,
  },
});
