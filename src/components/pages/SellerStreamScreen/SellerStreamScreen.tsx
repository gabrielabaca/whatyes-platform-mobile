/**
 * SellerStreamScreen
 * Pantalla para el streamer: crea room en service-platform, pasa a live (Kinesis),
 * en Android envía video con el Producer SDK; en iOS solo preview (ingest opcional más adelante).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Animated,
  Modal,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { RTCView } from 'react-native-webrtc';
import type { MediaStream } from 'react-native-webrtc';
import { Text } from '../../atoms/Text';
import { Heart, Send, MessageSquare, MessageSquareOff, ChevronUp, ChevronDown, Maximize2, Square, ArrowLeft, FlipHorizontal, Users, Gavel } from 'lucide-react-native';
import type { StreamConfig } from '../StreamConfigScreen';
import { useAuth } from '../../../hooks/useAuth';
import { storage } from '../../../utils/storage';
import { createRoom, goLive, endStream, getWebRTCCredentials } from '../../../api/platformApi';
import { startKinesisWebRTCMaster, stopKinesisWebRTCMaster } from '../../../native/KinesisWebRTCNative';
import { useStreamChat } from '../../../hooks/useStreamChat';
import { AuctionWinnerOverlay } from '../../molecules/AuctionWinnerOverlay/AuctionWinnerOverlay';
import KeepAwake from 'react-native-keep-awake';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type ChatSize = 'small' | 'medium' | 'large';

type LikeEvent = {
  id: string;
  username: string;
  offset: number;
};

const FloatingHeart: React.FC<{
  event: LikeEvent;
  onDone: (id: string) => void;
}> = ({ event, onDone }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 1400,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDone(event.id);
    });
  }, [event.id, onDone, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -140],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [1, 1, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.35],
  });

  return (
    <Animated.View
      style={[
        styles.floatingHeart,
        {
          right: 16 + event.offset,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <Heart size={18} color="#ff4d6d" fill="#ff4d6d" />
      <Text style={styles.likeLabel}>{event.username}</Text>
    </Animated.View>
  );
};

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
  const [messageText, setMessageText] = useState('');
  const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>('front');
  const [token, setToken] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [localWebRTCStream, setLocalWebRTCStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [likeEvents, setLikeEvents] = useState<LikeEvent[]>([]);
  const cameraRef = useRef<Camera>(null);
  const flatListRef = useRef<FlatList>(null);
  const auctionBidsListRef = useRef<FlatList>(null);
  const likeSeqRef = useRef(0);
  const prevMessagesLengthRef = useRef(0);
  const initialMessagesHandledRef = useRef(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLikeDone = useCallback((id: string) => {
    setLikeEvents((prev) => prev.filter((event) => event.id !== id));
  }, []);

  const handleLikeEvent = useCallback((like: { username?: string }) => {
    const username = (like.username || 'Alguien').trim() || 'Alguien';
    const id = `${Date.now()}-${likeSeqRef.current++}`;
    const offset = Math.floor(Math.random() * 40);
    setLikeEvents((prev) => [...prev, { id, username, offset }].slice(-6));
  }, []);

  const { messages, viewerCount, sendChat, sendAuctionStart, isAuctionActive, auctionSecondsRemaining, auctionBids, auctionWinner } = useStreamChat({
    roomId,
    accessToken: token,
    onLike: handleLikeEvent,
  });

  const [showAuctionModal, setShowAuctionModal] = useState(false);
  const [auctionDuration, setAuctionDuration] = useState('10');

  const handleStartAuction = () => {
    const duration = Math.max(5, Math.min(300, parseInt(auctionDuration, 10) || 10));
    sendAuctionStart(duration);
    setShowAuctionModal(false);
  };

  // Mantener la pantalla activa durante el stream
  useEffect(() => {
    KeepAwake.activate();
    return () => {
      KeepAwake.deactivate();
    };
  }, []);

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

  const handleToggleChat = () => {
    setShowChat(prev => {
      if (!prev) setUnreadCount(0);
      return !prev;
    });
  };

  useEffect(() => {
    if (showChat) {
      prevMessagesLengthRef.current = messages.length;
      return;
    }
    const prev = prevMessagesLengthRef.current;
    if (messages.length > 0 && !initialMessagesHandledRef.current) {
      initialMessagesHandledRef.current = true;
      prevMessagesLengthRef.current = messages.length;
      return;
    }
    if (messages.length > prev) {
      setUnreadCount(c => c + (messages.length - prev));
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, showChat]);
  const handleToggleChatSize = () => {
    setChatSize(s => (s === 'small' ? 'medium' : s === 'medium' ? 'large' : 'small'));
  };
  const handleSendMessage = () => {
    if (messageText.trim()) {
      sendChat(messageText.trim());
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

  useEffect(() => {
    if (!messages.length) return;
    const t = setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [messages.length]);

  useEffect(() => {
    if (!auctionBids.length) return;
    const t = setTimeout(() => auctionBidsListRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [auctionBids.length]);

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
      <AuctionWinnerOverlay winner={auctionWinner} />
      <View pointerEvents="none" style={styles.floatingHeartsLayer}>
        {likeEvents.map((event) => (
          <FloatingHeart key={event.id} event={event} onDone={handleLikeDone} />
        ))}
      </View>
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
        <View style={styles.topRightBadges}>
          {isAuctionActive && (
            <View style={styles.auctionBidsPanel}>
              <View style={styles.auctionBidsHeader}>
                <Gavel size={14} color="#ffffff" />
                <Text style={styles.auctionBidsTitle}>Ofertas</Text>
                {auctionSecondsRemaining !== null && (
                  <Text style={styles.auctionCountdownText}>{auctionSecondsRemaining}s</Text>
                )}
              </View>
              {auctionBids.length > 0 ? (
                <FlatList
                  ref={auctionBidsListRef}
                  data={auctionBids}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.auctionBidRow}>
                      <Text style={styles.auctionBidUser} numberOfLines={1}>{item.username}</Text>
                      <Text style={styles.auctionBidAmount}>${item.amount}</Text>
                    </View>
                  )}
                  style={styles.auctionBidsList}
                  contentContainerStyle={styles.auctionBidsContent}
                  scrollEnabled={auctionBids.length > 3}
                />
              ) : (
                <Text style={styles.auctionBidsEmpty}>Sin ofertas aún</Text>
              )}
            </View>
          )}
          <View style={styles.viewerBadge}>
            <Users size={14} color="#ffffff" />
            <Text style={styles.viewerText}>{viewerCount}</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>EN VIVO</Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomControls}>
        {!isAuctionActive && (
          <TouchableOpacity style={styles.auctionButton} activeOpacity={0.7} onPress={() => setShowAuctionModal(true)}>
            <Gavel size={24} color="#ffffff" />
            <Text style={styles.auctionButtonText}>Subasta</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.cameraToggleButton} activeOpacity={0.7} onPress={handleToggleCamera}>
          <FlipHorizontal size={24} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chatToggleButton, unreadCount > 0 && styles.chatToggleButtonHighlight]}
          activeOpacity={0.7}
          onPress={handleToggleChat}
        >
          <View style={styles.chatIconWrapper}>
            {showChat ? <MessageSquareOff size={24} color="#ffffff" /> : <MessageSquare size={24} color="#ffffff" />}
            {unreadCount > 0 && (
              <View style={styles.chatBadge}>
                <Text style={styles.chatBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <Modal visible={showAuctionModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text variant="h3" className="text-white mb-2">Iniciar subasta</Text>
            <Text variant="body" className="text-white/80 mb-4">Duración en segundos (5-300):</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="10"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              value={auctionDuration}
              onChangeText={setAuctionDuration}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowAuctionModal(false)} activeOpacity={0.7}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalStartButton} onPress={handleStartAuction} activeOpacity={0.7}>
                <Text style={styles.modalStartText}>Iniciar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  topRightBadges: { alignItems: 'flex-end', gap: 8 },
  auctionBidsPanel: { backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 12, padding: 10, minWidth: 140, maxHeight: 180 },
  auctionBidsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  auctionBidsTitle: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  auctionCountdownText: { color: '#f59e0b', fontSize: 12, fontWeight: '700', marginLeft: 'auto' },
  auctionBidsList: { maxHeight: 120 },
  auctionBidsContent: { gap: 4 },
  auctionBidRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  auctionBidUser: { color: '#ffffff', fontSize: 11, flex: 1 },
  auctionBidAmount: { color: '#22c55e', fontSize: 12, fontWeight: '700', marginLeft: 8 },
  auctionBidsEmpty: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '500', paddingVertical: 8 },
  viewerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  viewerText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff', marginRight: 6 },
  liveText: { color: '#ffffff', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  bottomControls: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: Platform.OS === 'ios' ? 40 : 20, paddingHorizontal: 16, paddingTop: 20, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12, zIndex: 3 },
  auctionButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0284c7', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 24 },
  auctionButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  cameraToggleButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  chatToggleButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  chatToggleButtonHighlight: { backgroundColor: 'rgba(2,132,199,0.6)', borderWidth: 2, borderColor: '#0284c7' },
  chatIconWrapper: { position: 'relative' },
  chatBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  chatBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: 'rgba(30,30,30,0.98)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 320 },
  modalInput: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, color: '#ffffff', fontSize: 16, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
  modalCancelButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)' },
  modalCancelText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  modalStartButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#0284c7' },
  modalStartText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
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
  floatingHeartsLayer: {
    position: 'absolute',
    right: 0,
    bottom: Platform.OS === 'ios' ? 120 : 100,
    left: 0,
    height: 180,
    zIndex: 5,
  },
  floatingHeart: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
  },
  likeLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
