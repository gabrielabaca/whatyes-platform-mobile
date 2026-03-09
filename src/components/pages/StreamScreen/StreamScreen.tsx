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
import { useStreamChat } from '../../../hooks/useStreamChat';
import { AuctionWinnerOverlay } from '../../molecules/AuctionWinnerOverlay/AuctionWinnerOverlay';
import { useFloatingHearts, FloatingHeartsLayer } from '../../molecules/FloatingHearts/FloatingHearts';
import { enableSpeakerphone, disableSpeakerphone } from '../../../utils/audioRoute';
import KeepAwake from 'react-native-keep-awake';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const [bidAmount, setBidAmount] = useState(10);
  const [messageText, setMessageText] = useState('');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [chatToken, setChatToken] = useState<string | null>(null);
  const viewerCleanupRef = useRef<(() => void) | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const auctionBidsListRef = useRef<FlatList>(null);
  const prevMessagesLengthRef = useRef(0);
  const initialMessagesHandledRef = useRef(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { likeEvents, handleLikeDone, handleLikeEvent } = useFloatingHearts();

  const roomId = stream.id;
  const {
    messages,
    viewerCount,
    isConnected: isChatConnected,
    sendChat,
    sendLike,
    sendBid,
    isAuctionActive,
    auctionSecondsRemaining,
    auctionBids,
    auctionWinner,
  } = useStreamChat({ roomId, accessToken: chatToken, onLike: handleLikeEvent });

  useEffect(() => {
    KeepAwake.activate();
    return () => {
      KeepAwake.deactivate();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        enableSpeakerphone();
        const token = await storage.getAccessToken();
        if (!token) {
          if (!cancelled) setStreamError('No se pudo obtener la sesión');
          return;
        }
        if (!cancelled) setChatToken(token);
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
      disableSpeakerphone();
    };
  }, [roomId]);

  useEffect(() => {
    const timer = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timer);
  }, [showControls]);

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

  const handleDecreaseBid = () => { if (bidAmount > 1) setBidAmount(bidAmount - 1); };
  const handleIncreaseBid = () => setBidAmount(bidAmount + 1);

  const handleSubmitBid = () => {
    sendBid(bidAmount);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleSendMessage = () => {
    if (messageText.trim()) {
      sendChat(messageText.trim());
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
      <AuctionWinnerOverlay winner={auctionWinner} />
      <FloatingHeartsLayer likeEvents={likeEvents} onLikeDone={handleLikeDone} />
      <View style={styles.videoContainer}>
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.video}
          objectFit="cover"
        />
        <TouchableOpacity style={styles.videoOverlay} activeOpacity={1} onPress={handleScreenPress} />

        {isAuctionActive && (
          <View style={styles.bidInterface}>
            <View style={styles.auctionBidsPanel}>
              <View style={styles.auctionBidsHeader}>
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
                <Text style={styles.statText}>{isChatConnected ? viewerCount : stream.viewerCount}</Text>
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
            <TouchableOpacity
              style={[styles.soundButton, unreadCount > 0 && styles.chatToggleButtonHighlight]}
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
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.7} onPress={sendLike}>
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
  chatToggleButtonHighlight: { backgroundColor: 'rgba(2,132,199,0.6)', borderWidth: 2, borderColor: '#0284c7' },
  chatIconWrapper: { position: 'relative' },
  chatBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  chatBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '700' },
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
  bidInterface: { position: 'absolute', bottom: Platform.OS === 'ios' ? 200 : 180, left: 0, right: 0, alignItems: 'center', zIndex: 5, paddingHorizontal: 16, gap: 8 },
  auctionBidsPanel: { backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 12, padding: 10, width: '100%', maxWidth: 280, maxHeight: 140 },
  auctionBidsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 },
  auctionBidsTitle: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  auctionCountdownText: { color: '#f59e0b', fontSize: 14, fontWeight: '700' },
  auctionBidsList: { maxHeight: 80 },
  auctionBidsContent: { gap: 4 },
  auctionBidRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  auctionBidUser: { color: '#ffffff', fontSize: 12, flex: 1 },
  auctionBidAmount: { color: '#22c55e', fontSize: 13, fontWeight: '700', marginLeft: 8 },
  auctionBidsEmpty: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500', paddingVertical: 8 },
  bidContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 16, padding: 8 },
  bidButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  bidAmountButton: { minWidth: 120, height: 56, borderRadius: 28, backgroundColor: '#0284c7', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  bidAmountText: { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  bidSubmitText: { color: '#ffffff', fontSize: 11, fontWeight: '600', marginTop: 2 },
});
