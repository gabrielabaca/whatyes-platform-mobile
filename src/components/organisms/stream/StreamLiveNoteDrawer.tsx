/**
 * Drawer "Notas" del vivo — Figma 698-13095. Se abre desde el botón comment_bank del rail.
 *
 * Dos modos sobre el mismo panel:
 * - `mode="edit"` (vendedor): texto libre sobre el glass (sin caja), link dorado
 *   "Pegar notas" y CTA "Publicar". Panel alto fijo: nota arriba, acciones abajo.
 * - `mode="read"` (viewer): solo la nota publicada, sin acciones, ajustado al contenido.
 *
 * El drawer entra desde la base y tapa la barra de navegación por venir de
 * `StreamBottomSheet` (portal raíz), igual que el resto de los drawers del vivo.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Text as RNText,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet, streamBottomPanelStyle, streamSheetStyles } from './StreamBottomSheet';
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
    return (
      <StreamBottomSheet
        visible={visible}
        title={t('stream.noteDrawer.title')}
        onClose={onClose}
        panelStyle={streamBottomPanelStyle}
        contentContainerStyle={styles.contentRead}
      >
        {note ? (
          <RNText style={styles.noteBody}>{note}</RNText>
        ) : (
          <RNText style={styles.emptyBody}>{t('stream.noteDrawer.viewerEmpty')}</RNText>
        )}
      </StreamBottomSheet>
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
      <TextInput
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
  contentRead: {
    gap: 16,
    width: '100%',
    alignItems: 'stretch',
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
