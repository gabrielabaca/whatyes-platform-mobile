/**
 * Estado de la nota del vivo (botón comment_bank).
 *
 * La nota vive en la sala, no en la pantalla: el vendedor la publica desde el stream
 * y los viewers la leen. Este hook unifica las tres fuentes que la traen —el fetch de
 * `live-commerce` al abrir, el `init` del WS y el evento `room_note` de una publicación
 * en curso— y expone un único valor, además de la acción de publicar (solo vendedor).
 */
import { useCallback, useEffect, useState } from 'react';
import { publishRoomNote } from '../api/platformApi';

export interface UseLiveRoomNoteOptions {
  roomId: string | null;
  accessToken: string | null;
  /** Nota que llegó en `GET /rooms/{id}/live-commerce` (o null si no vino). */
  initialNote?: string | null;
  /**
   * Nota que llegó por WS. `undefined` = el WS todavía no dijo nada y manda
   * `initialNote`; `null` = el servidor confirmó que no hay nota.
   */
  liveNote?: string | null;
  /** El usuario es el vendedor: solo entonces se puede publicar. */
  canEdit?: boolean;
}

export interface UseLiveRoomNoteResult {
  /** Nota vigente, o null si el vivo no tiene nota. */
  note: string | null;
  /** Hay una nota publicada y no vacía. */
  hasNote: boolean;
  publishing: boolean;
  error: string | null;
  /** Publica la nota. Devuelve true si el backend la aceptó. */
  publish: (text: string) => Promise<boolean>;
  clearError: () => void;
}

function normalize(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? value : null;
}

export function useLiveRoomNote({
  roomId,
  accessToken,
  initialNote,
  liveNote,
  canEdit = false,
}: UseLiveRoomNoteOptions): UseLiveRoomNoteResult {
  /**
   * Copia local para que "Publicar" se vea al instante: el evento `room_note` que
   * confirma la escritura puede tardar, y el vendedor no debería ver su propia nota
   * volver al placeholder mientras tanto.
   */
  const [optimisticNote, setOptimisticNote] = useState<string | null | undefined>(undefined);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * El WS es la fuente más fresca; cuando llega un valor, el optimista ya cumplió y se
   * suelta para no quedar pisando una edición hecha desde otro dispositivo del vendedor.
   */
  useEffect(() => {
    if (liveNote !== undefined) setOptimisticNote(undefined);
  }, [liveNote]);

  /** Cambiar de sala descarta lo que quedó de la anterior. */
  useEffect(() => {
    setOptimisticNote(undefined);
    setError(null);
  }, [roomId]);

  const note =
    optimisticNote !== undefined
      ? normalize(optimisticNote)
      : liveNote !== undefined
        ? normalize(liveNote)
        : normalize(initialNote);

  const publish = useCallback(
    async (text: string): Promise<boolean> => {
      if (!canEdit || !roomId || !accessToken) return false;
      const next = normalize(text);
      setPublishing(true);
      setError(null);
      const previous = optimisticNote;
      setOptimisticNote(next);
      try {
        const res = await publishRoomNote(accessToken, roomId, text.trim());
        setOptimisticNote(normalize(res.note));
        return true;
      } catch (e) {
        // Rollback: la nota vuelve a lo último confirmado, no al texto que no entró.
        setOptimisticNote(previous);
        setError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setPublishing(false);
      }
    },
    [canEdit, roomId, accessToken, optimisticNote]
  );

  return {
    note,
    hasNote: note != null,
    publishing,
    error,
    publish,
    clearError: useCallback(() => setError(null), []),
  };
}
