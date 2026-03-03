/**
 * SellerStreamScreen
 * Pantalla para el streamer: crea room en service-platform, pasa a live (Kinesis),
 * en Android envía video con el Producer SDK; en iOS solo preview (ingest opcional más adelante).
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Platform,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { RTCView } from 'react-native-webrtc';
import type { MediaStream } from 'react-native-webrtc';
import { Text } from '../../atoms/Text';
import { Send, MessageSquare, MessageSquareOff, ChevronUp, ChevronDown, Maximize2, Square, ArrowLeft, FlipHorizontal } from 'lucide-react-native';
import type { StreamConfig } from '../StreamConfigScreen';
import { useAuth } from '../../../hooks/useAuth';
import { storage } from '../../../utils/storage';
import { createRoom, goLive, endStream, getWebRTCCredentials } from '../../../api/platformApi';
import { startKinesisWebRTCMaster, stopKinesisWebRTCMaster } from '../../../native/KinesisWebRTCNative';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
}

type ChatSize = 'small' | 'medium' | 'large';

interface SellerStreamScreenProps {
  streamConfig: StreamConfig;
  onEndStream: () => void;
}

export const SellerStreamScreen: React.FC<SellerStreamScreenProps> = ({
  streamConfig,
  onEndStream,
}) => {
  const { user } = useAuth();
  const [showChat, setShowChat] = useState(false);
  const [chatSize, setChatSize] = useState<ChatSize>('medium');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>('front');
  const [token, setToken] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [localWebRTCStream, setLocalWebRTCStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const cameraRef = useRef<Camera>(null);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  // Crear room (draft) y pasar a live al montar
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await storage.getAccessToken();
        if (!t || cancelled) {
          if (!cancelled) setStreamError('No se pudo obtener la sesión');
          return;
        }
        setToken(t);
        const name = streamConfig?.title || user?.name || undefined;
        const room = await createRoom(t, name || null);
        if (cancelled) return;
        const live = await goLive(t, room.uuid);
        if (cancelled) return;
        setRoomId(live.uuid);
        // Solo WebRTC: el streamer envía video únicamente por Kinesis WebRTC (Master)
        try {
          const webrtcCreds = await getWebRTCCredentials(t, live.uuid, 'master');
          setIsStreaming(true);
          // Dar un pequeño margen para que VisionCamera libere la cámara
          await new Promise((resolve) => setTimeout(resolve, 200));
          console.log('[Seller] Iniciando stream WebRTC (Master)...', { roomId: live.uuid });
          await startKinesisWebRTCMaster(webrtcCreds, {
            onLocalStream: (stream) => {
              setLocalWebRTCStream(stream);
            },
          });
          console.log('[Seller] Stream WebRTC iniciado correctamente. Esperando viewers.');
        } catch (e: any) {
          if (!cancelled) {
            setIsStreaming(false);
            setStreamError(e?.message || 'No se pudo iniciar el envío por WebRTC. Comprueba la conexión.');
          }
        }
      } catch (e: any) {
        if (!cancelled) setStreamError(e?.message || 'Error al iniciar la sala');
      } finally {
        if (!cancelled) setIsStarting(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleEndStream = () => {
    Alert.alert(
      'Finalizar Stream',
      '¿Seguro que deseas finalizar el stream?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          style: 'destructive',
          onPress: async () => {
            try {
              await stopKinesisWebRTCMaster();
            } catch (_) {}
            setLocalWebRTCStream(null);
            setIsStreaming(false);
            if (token && roomId) {
              try {
                await endStream(token, roomId);
              } catch (_) {}
            }
            onEndStream();
          },
        },
      ],
    );
  };

  const { hasPermission, requestPermission } = useCameraPermission();
  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');
  const device = cameraPosition === 'front' ? frontDevice : backDevice;

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  const handleToggleChat = () => setShowChat(!showChat);
  const handleToggleChatSize = () => {
    setChatSize(s => (s === 'small' ? 'medium' : s === 'medium' ? 'large' : 'small'));
  };
  const handleSendMessage = () => {
    if (messageText.trim()) {
      setMessages([
        ...messages,
        { id: Date.now().toString(), username: 'Tú', message: messageText.trim(), timestamp: 'ahora' },
      ]);
      setMessageText('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const getChatHeight = () => {
    switch (chatSize) {
      case 'small': return SCREEN_HEIGHT * 0.25;
      case 'medium': return SCREEN_HEIGHT * 0.4;
      case 'large': return SCREEN_HEIGHT * 0.6;
      default: return SCREEN_HEIGHT * 0.4;
    }
  };
  const getChatSizeIcon = () => {
    switch (chatSize) {
      case 'small': return <ChevronUp size={16} color="#ffffff" />;
      case 'medium': return <Maximize2 size={16} color="#ffffff" />;
      case 'large': return <ChevronDown size={16} color="#ffffff" />;
      default: return <Maximize2 size={16} color="#ffffff" />;
    }
  };

  const handleToggleCamera = () => setCameraPosition(p => (p === 'front' ? 'back' : 'front'));

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <TouchableOpacity style={styles.backButton} onPress={onEndStream} activeOpacity={0.7}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text variant="h3" className="text-white text-center mb-4">Permisos de Cámara</Text>
        <Text variant="body" className="text-white text-center mb-6">Necesitamos acceso a tu cámara para transmitir</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} activeOpacity={0.8}>
          <Text variant="body" className="text-white font-semibold">Solicitar Permisos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!frontDevice && !backDevice) {
    return (
      <View style={styles.permissionContainer}>
        <TouchableOpacity style={styles.backButton} onPress={onEndStream} activeOpacity={0.7}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text variant="h3" className="text-white text-center mb-4">Cámara no disponible</Text>
        <TouchableOpacity style={styles.backButtonText} onPress={onEndStream} activeOpacity={0.8}>
          <Text variant="body" className="text-white font-semibold">Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (streamError) {
    return (
      <View style={styles.permissionContainer}>
        <TouchableOpacity style={styles.backButton} onPress={onEndStream} activeOpacity={0.7}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text variant="h3" className="text-white text-center mb-4">Error</Text>
        <Text variant="body" className="text-white text-center mb-6">{streamError}</Text>
        <TouchableOpacity style={styles.backButtonText} onPress={onEndStream} activeOpacity={0.8}>
          <Text variant="body" className="text-white font-semibold">Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isStarting || !roomId) {
    return (
      <View style={styles.permissionContainer}>
        <TouchableOpacity style={styles.backButton} onPress={onEndStream} activeOpacity={0.7}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <ActivityIndicator size="large" color="#fff" />
        <Text variant="body" className="text-white text-center mt-4">Iniciando sala en vivo...</Text>
      </View>
    );
  }

  const activeDevice = device || (cameraPosition === 'front' ? backDevice : frontDevice);

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      {localWebRTCStream ? (
        <RTCView
          streamURL={localWebRTCStream.toURL()}
          style={styles.camera}
          objectFit="cover"
        />
      ) : (
        <>
          {activeDevice && !isStreaming && (
            <Camera
              ref={cameraRef}
              style={styles.camera}
              device={activeDevice}
              isActive={true}
              video={true}
              audio={true}
            />
          )}
          {(!activeDevice || isStreaming) && (
            <View style={styles.camera}>
              <ActivityIndicator size="large" color="#fff" style={StyleSheet.absoluteFill} />
              <Text variant="body" className="text-white text-center">
                {isStreaming ? 'Iniciando transmisión...' : 'Preparando cámara...'}
              </Text>
            </View>
          )}
        </>
      )}

      <View style={styles.topControls}>
        <TouchableOpacity onPress={handleEndStream} style={styles.endStreamButton} activeOpacity={0.7}>
          <Square size={20} color="#ffffff" />
          <Text style={styles.endStreamText}>Finalizar</Text>
        </TouchableOpacity>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>EN VIVO</Text>
        </View>
      </View>

      <View style={styles.bottomControls}>
        <TouchableOpacity style={styles.cameraToggleButton} activeOpacity={0.7} onPress={handleToggleCamera}>
          <FlipHorizontal size={24} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.chatToggleButton} activeOpacity={0.7} onPress={handleToggleChat}>
          {showChat ? <MessageSquareOff size={24} color="#ffffff" /> : <MessageSquare size={24} color="#ffffff" />}
        </TouchableOpacity>
      </View>

      {showChat && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.chatContainer, { height: getChatHeight() }]}>
          <View style={styles.chatHeader}>
            <Text variant="body" className="text-white font-semibold">Chat en vivo</Text>
            <TouchableOpacity style={styles.chatSizeButton} onPress={handleToggleChatSize} activeOpacity={0.7}>
              {getChatSizeIcon()}
            </TouchableOpacity>
          </View>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.chatMessage}>
                <View style={styles.messageBubble}>
                  <View style={styles.messageHeader}>
                    <Text style={styles.messageUsername}>{item.username}</Text>
                    <Text style={styles.messageTimestamp}>{item.timestamp}</Text>
                  </View>
                  <Text style={styles.messageText}>{item.message}</Text>
                </View>
              </View>
            )}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
          />
          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#9ca3af"
              value={messageText}
              onChangeText={setMessageText}
              onSubmitEditing={handleSendMessage}
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage} activeOpacity={0.7}>
              <Send size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  camera: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  permissionContainer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', padding: 20 },
  backButton: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  permissionButton: { backgroundColor: '#0284c7', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 12 },
  backButtonText: { backgroundColor: '#6b7280', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 12 },
  topControls: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 3 },
  endStreamButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, gap: 8 },
  endStreamText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff', marginRight: 6 },
  liveText: { color: '#ffffff', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  bottomControls: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: Platform.OS === 'ios' ? 40 : 20, paddingHorizontal: 16, paddingTop: 20, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12, zIndex: 3 },
  cameraToggleButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  chatToggleButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  chatContainer: { position: 'absolute', bottom: Platform.OS === 'ios' ? 100 : 70, left: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, overflow: 'hidden', zIndex: 4 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)' },
  chatSizeButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  chatContent: { paddingHorizontal: 12, paddingVertical: 8, flexGrow: 1 },
  chatMessage: { marginBottom: 8 },
  messageBubble: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 8 },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  messageUsername: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  messageTimestamp: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  messageText: { color: '#ffffff', fontSize: 13, lineHeight: 18 },
  chatInputContainer: { flexDirection: 'row', alignItems: 'center', padding: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  chatInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 10 : 8, color: '#ffffff', fontSize: 14, marginRight: 8 },
  sendButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0284c7', justifyContent: 'center', alignItems: 'center' },
});
