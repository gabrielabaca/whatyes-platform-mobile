/**
 * Recuperación de un vivo tras un crash (B-04).
 *
 * Al abrir la app con sesión, pregunta UNA vez al servidor si el vendedor tiene
 * un vivo en curso (GET /rooms/me/live). Si lo tiene, ofrece retomarlo o
 * finalizarlo. La condición sale del servidor, no de un flag local: la sala solo
 * se devuelve mientras está LIVE (dentro del grace period del broadcaster);
 * pasado ese plazo el servidor ya la cerró y el aviso no aparece.
 *
 * Quien no tiene ningún vivo no ve nada: el arranque sigue igual.
 */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { appAlert } from '../alerts';
import { endStream, getMyLiveRoom, type PlatformRoomResponse } from '../api/platformApi';
import { storage } from '../utils/storage';
import type { StreamConfig } from '../components/organisms/startLive/types';

/** StreamConfig mínimo para montar SellerStreamScreen sobre una sala ya LIVE. */
export function streamConfigFromRoom(room: PlatformRoomResponse): StreamConfig {
  return {
    title: room.name ?? '',
    description: '',
    interestCategoryUuids: room.interest_category_uuids ?? [],
    scheduledAt: room.scheduled_at ?? null,
    recurrence: (room.recurrence as StreamConfig['recurrence']) ?? 'none',
    moderatorUserIds: room.moderator_user_ids ?? [],
    saleFormat: (room.sale_format as StreamConfig['saleFormat']) ?? 'individual',
    explicitContent: room.explicit_content ?? false,
    blockedWordsEnabled: room.blocked_words_enabled ?? false,
    blockedWords: room.blocked_words ?? [],
    privacy: (room.privacy as StreamConfig['privacy']) ?? 'public',
    coverUrl: room.cover_url ?? null,
    introVideoUrl: room.intro_video_url ?? null,
  };
}

interface Options {
  /** Sesión lista y pantalla de inicio montada. */
  enabled: boolean;
  onResume: (room: PlatformRoomResponse) => void;
}

export function useSellerLiveResumePrompt({ enabled, onResume }: Options): void {
  const { t } = useTranslation();
  const checkedRef = useRef(false);
  const onResumeRef = useRef(onResume);

  useEffect(() => {
    onResumeRef.current = onResume;
  }, [onResume]);

  useEffect(() => {
    if (!enabled || checkedRef.current) return;
    checkedRef.current = true;
    let cancelled = false;
    (async () => {
      const accessToken = await storage.getAccessToken();
      if (!accessToken || cancelled) return;
      let room: PlatformRoomResponse | null = null;
      try {
        room = await getMyLiveRoom(accessToken);
      } catch {
        // Sin respuesta no hay aviso: si el vivo sigue abierto el servidor lo
        // cierra solo al vencer el grace, y no vale la pena frenar el arranque.
        return;
      }
      if (cancelled || !room) return;
      const liveRoom = room;
      appAlert(t('stream.resumeLivePromptTitle'), t('stream.resumeLivePromptBody'), [
        {
          text: t('stream.resumeLivePromptEnd'),
          style: 'cancel',
          onPress: () => {
            void endStream(accessToken, liveRoom.uuid).catch(() => {});
          },
        },
        {
          text: t('stream.resumeLivePromptResume'),
          onPress: () => onResumeRef.current(liveRoom),
        },
      ]);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, t]);
}
