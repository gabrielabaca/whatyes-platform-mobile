/**
 * "Iniciar chat con este usuario" desde cualquier pantalla (perfil, detalle de
 * compra/venta): POST /conversations es idempotente —abre o recupera el hilo—
 * y el resultado se muestra en un ConversationModal que renderiza el caller.
 */
import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { createConversation, type ConversationItem } from '../api/platformApi';
import { storage } from '../utils/storage';

export function useStartChat() {
  const { t } = useTranslation();
  const [conversation, setConversation] = useState<ConversationItem | null>(null);
  /** Evita dos POST (y dos modales) si el usuario toca dos veces el botón. */
  const startingRef = useRef(false);

  const startChat = useCallback(
    async (peerUserId: string) => {
      if (startingRef.current || !peerUserId) return;
      startingRef.current = true;
      try {
        const token = await storage.getAccessToken();
        if (!token) return;
        setConversation(await createConversation(token, peerUserId));
      } catch {
        Alert.alert(t('common.appName'), t('chat.startError'));
      } finally {
        startingRef.current = false;
      }
    },
    [t]
  );

  const closeChat = useCallback(() => setConversation(null), []);

  return { conversation, startChat, closeChat };
}
