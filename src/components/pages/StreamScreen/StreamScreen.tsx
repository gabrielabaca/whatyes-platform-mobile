/**
 * Stream Screen
 * Pantalla de consumo del stream en vivo (solo WebRTC con Kinesis).
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
  ActivityIndicator,
} from 'react-native';

import { RTCView } from 'react-native-webrtc';
import { Text } from '../../atoms/Text';
import { X, Users, Clock, Heart, Volume2, VolumeX, Send, ChevronUp, ChevronDown, Maximize2, MessageSquare, MessageSquareOff, Minus, Plus } from 'lucide-react-native';
import type { StreamData } from '../../molecules/StreamCard';
import { storage } from '../../../utils/storage';
import { getWebRTCCredentials } from '../../../api/platformApi';
import { startKinesisWebRTCViewer, stopKinesisWebRTCViewer } from '../../../native/KinesisWebRTCNative';
import type { MediaStream } from 'react-native-webrtc';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
}

interface StreamScreenProps {
  stream: StreamData;
  onClose: () => void;
  chatHeight?: number;
}

type ChatSize = 'small' | 'medium' | 'large';

export const StreamScreen: React.FC<StreamScreenProps> = ({
  stream,
  onClose,
  chatHeight = SCREEN_HEIGHT * 0.4,
}) => {
  const [showControls, setShowControls] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [chatSize, setChatSize] = useState<ChatSize>('medium');
  const [showChat, setShowChat] = useState(false);
  const [showBidInterface, setShowBidInterface] = useState(false);
  const [bidAmount, setBidAmount] = useState(10);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const viewerCleanupRef = useRef<(() => void) | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const roomId = stream.id;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await storage.getAccessToken();
        if (!token) {
          if (!cancelled) setStreamError('No se pudo obtener la sesión');
          return;
        }
        const webrtcCreds = await getWebRTCCredentials(token, roomId, 'viewer');
        const cleanup = await startKinesisWebRTCViewer(
          webrtcCreds,
          (stream) => {
            if (!cancelled) setRemoteStream(stream);
          },
          (err) => {
            if (!cancelled) setStreamError(err?.message || 'Error de conexión WebRTC');
          },
          () => {
            if (!cancelled) onClose();
          }
        );
        if (!cancelled) viewerCleanupRef.current = cleanup;
      } catch (e: any) {
        if (!cancelled) setStreamError(e?.message || 'No se pudo cargar el stream');
      } finally {
        if (!cancelled) setIsConnecting(false);
      }
    })();
    return () => {
      cancelled = true;
      viewerCleanupRef.current?.();
      viewerCleanupRef.current = null;
      stopKinesisWebRTCViewer().catch(() => {});
    };
  }, [roomId]);

  useEffect(() => {
    const timer = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timer);
  }, [showControls]);

  useEffect(() => {
    if (__DEV__) {
      const globalObj = global as any;
      globalObj.showBidInterface = () => setShowBidInterface(prev => !prev);
      globalObj.hideBidInterface = () => setShowBidInterface(false);
      globalObj.toggleBidInterface = () => setShowBidInterface(prev => !prev);
      globalObj.setBidAmount = (amount: number) => setBidAmount(amount);
    }
    return () => {
      if (__DEV__) {
        const globalObj = global as any;
        delete globalObj.showBidInterface;
        delete globalObj.hideBidInterface;
        delete globalObj.toggleBidInterface;
        delete globalObj.setBidAmount;
      }
    };
  }, []);

  useEffect(() => {
    if (!remoteStream) return;
    const audioTracks = remoteStream.getAudioTracks();
    audioTracks.forEach((track) => {
      track.enabled = !isMuted;
      if (typeof (track as any)._setVolume === 'function') {
        (track as any)._setVolume(isMuted ? 0 : 1.0);
      }
    });
  }, [remoteStream, isMuted]);

  const handleScreenPress = () => setShowControls(!showControls);
  const handleToggleMute = () => setIsMuted(!isMuted);
  const handleToggleChat = () => setShowChat(!showChat);

  const handleDecreaseBid = () => { if (bidAmount > 1) setBidAmount(bidAmount - 1); };
  const handleIncreaseBid = () => setBidAmount(bidAmount + 1);

  const handleSubmitBid = () => {
    const bidMessage: ChatMessage = {
      id: Date.now().toString(),
      username: 'Tú',
      message: `Oferta enviada: $${bidAmount}`,
      timestamp: 'ahora',
    };
    setMessages([...messages, bidMessage]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
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

  const handleToggleChatSize = () => {
    setChatSize(s => (s === 'small' ? 'medium' : s === 'medium' ? 'large' : 'small'));
  };

  const getChatHeight = (): number => {
    switch (chatSize) {
      case 'small': return SCREEN_HEIGHT * 0.25;
      case 'medium': return SCREEN_HEIGHT * 0.4;
      case 'large': return SCREEN_HEIGHT * 0.6;
      default: return SCREEN_HEIGHT * 0.4;
    }
  };

  const getChatSizeIcon = () => {
    switch (chatSize) {
      case 'small': return <ChevronUp size={18} color="#ffffff" />;
      case 'medium': return <Maximize2 size={18} color="#ffffff" />;
      case 'large': return <ChevronDown size={18} color="#ffffff" />;
      default: return <Maximize2 size={18} color="#ffffff" />;
    }
  };

  if (streamError) {
    const isNoFragments = (streamError as string).includes('Aún no hay video') || (streamError as string).includes('broadcaster');
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Text variant="h3" className="text-white mb-2">
          {isNoFragments ? 'Esperando video' : 'Error al conectar'}
        </Text>
        <Text variant="body" className="text-white mb-4 text-center">
          {streamError}
        </Text>
        {isNoFragments && (
          <Text variant="body" className="text-white/80 mb-4 text-center">
            Pide al streamer que confirme que la transmisión está activa y vuelve a intentar.
          </Text>
        )}
        <TouchableOpacity onPress={onClose} style={{ padding: 12, backgroundColor: '#333', borderRadius: 8 }}>
          <Text variant="body" className="text-white">Cerrar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isConnecting || !remoteStream) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text variant="body" className="text-white mt-4">
          {isConnecting ? 'Conectando por WebRTC...' : 'Esperando video del broadcaster...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <View style={styles.videoContainer}>
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.video}
          objectFit="cover"
        />
        <TouchableOpacity style={styles.videoOverlay} activeOpacity={1} onPress={handleScreenPress} />

        {showBidInterface && (
          <View style={styles.bidInterface}>
            <View style={styles.bidContainer}>
              <TouchableOpacity style={styles.bidButton} onPress={handleDecreaseBid} activeOpacity={0.7}>
                <Minus size={24} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.bidAmountButton} onPress={handleSubmitBid} activeOpacity={0.8}>
                <Text style={styles.bidAmountText}>${bidAmount}</Text>
                <Text style={styles.bidSubmitText}>Ofertar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bidButton} onPress={handleIncreaseBid} activeOpacity={0.7}>
                <Plus size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.alwaysVisibleTop}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>EN VIVO</Text>
          </View>
        </View>

        <View style={styles.alwaysVisibleBottom}>
          <View style={styles.sellerNameContainer}>
            <Text variant="h3" className="text-white font-bold">{stream.sellerName}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Users size={16} color="#ffffff" />
                <Text style={styles.statText}>{stream.viewerCount}</Text>
              </View>
              <View style={styles.statItem}>
                <Clock size={16} color="#ffffff" />
                <Text style={styles.statText}>{stream.streamingTime}</Text>
              </View>
            </View>
          </View>
          <View style={styles.alwaysVisibleButtons}>
            <TouchableOpacity style={styles.soundButton} activeOpacity={0.7} onPress={handleToggleMute}>
              {isMuted ? <VolumeX size={24} color="#ffffff" /> : <Volume2 size={24} color="#ffffff" />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.soundButton} activeOpacity={0.7} onPress={handleToggleChat}>
              {showChat ? <MessageSquareOff size={24} color="#ffffff" /> : <MessageSquare size={24} color="#ffffff" />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
              <Heart size={24} color="#ffffff" />
              <Text style={styles.actionButtonText}>Me gusta</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showChat && (
          <View style={[styles.chatContainer, { height: getChatHeight() }]}>
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
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  videoContainer: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#000000' },
  video: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 },
  videoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'transparent', zIndex: 1 },
  alwaysVisibleTop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingHorizontal: 16, paddingBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 3,
  },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff', marginRight: 6 },
  liveText: { color: '#ffffff', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  alwaysVisibleBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20, paddingHorizontal: 16, paddingTop: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 3,
  },
  sellerNameContainer: { flex: 1 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 16 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  alwaysVisibleButtons: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  soundButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  actionButton: { alignItems: 'center', gap: 4 },
  actionButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  chatContainer: {
    position: 'absolute', left: 16, right: 16, bottom: Platform.OS === 'ios' ? 140 : 120,
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, overflow: 'hidden', zIndex: 4,
  },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)' },
  chatSizeButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  chatContent: { paddingHorizontal: 12, paddingVertical: 8, flexGrow: 1 },
  chatMessage: { marginBottom: 8 },
  messageBubble: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 8 },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  messageUsername: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  messageTimestamp: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  messageText: { color: '#ffffff', fontSize: 13, lineHeight: 18 },
  chatInputContainer: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', alignItems: 'center', gap: 8 },
  chatInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, color: '#ffffff', fontSize: 14, maxHeight: 80 },
  sendButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0284c7', justifyContent: 'center', alignItems: 'center' },
  bidInterface: { position: 'absolute', bottom: Platform.OS === 'ios' ? 200 : 180, left: 0, right: 0, alignItems: 'center', zIndex: 5, paddingHorizontal: 16 },
  bidContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 16, padding: 8 },
  bidButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  bidAmountButton: { minWidth: 120, height: 56, borderRadius: 28, backgroundColor: '#0284c7', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  bidAmountText: { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  bidSubmitText: { color: '#ffffff', fontSize: 11, fontWeight: '600', marginTop: 2 },
});
