/**
 * Stream Screen
 * Pantalla de consumo del stream en vivo (WebRTC subscriber).
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
  ActivityIndicator,
} from 'react-native';

declare const global: any;
import Video from 'react-native-video';
import { Text } from '../../atoms/Text';
import { X, Users, Clock, Heart, Volume2, VolumeX, Send, ChevronUp, ChevronDown, Maximize2, MessageSquare, MessageSquareOff, Minus, Plus } from 'lucide-react-native';
import type { StreamData } from '../../molecules/StreamCard';
import { storage } from '../../../utils/storage';
import { getLivestreamWsUrl } from '../../../api/livestreamApi';
import { useLivestreamSignaling, type SignalingMessage } from '../../../hooks/useLivestreamSignaling';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

/**
 * Reordena la SDP para preferir H.264 en video. Si falla, devuelve la SDP original.
 */
function preferH264InVideoSDP(sdp: string): string {
  try {
    if (!sdp || typeof sdp !== 'string') return sdp;
    const lines = sdp.split(/\r?\n/);
    const out: string[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.startsWith('m=video ')) {
        out.push(line);
        i++;
        continue;
      }
      const mParts = line.split(/\s+/);
      const payloads = mParts.length >= 4 ? mParts.slice(3) : [];
      const ptToCodec: Record<string, string> = {};
      const sectionStart = out.length;
      out.push(line);
      i++;
      while (i < lines.length && !lines[i].startsWith('m=')) {
        const a = lines[i];
        const rtpmap = a.match(/^a=rtpmap:(\d+)\s+(\S+)/);
        if (rtpmap) ptToCodec[rtpmap[1]] = rtpmap[2].toUpperCase();
        out.push(a);
        i++;
      }
      const h264 = payloads.filter((pt) => (ptToCodec[pt] || '').includes('H264'));
      const other = payloads.filter((pt) => !(ptToCodec[pt] || '').includes('H264'));
      const newOrder = h264.length > 0 ? [...h264, ...other] : payloads;
      out[sectionStart] = mParts.slice(0, 3).concat(newOrder).join(' ');
    }
    const result = out.join('\r\n');
    return result.length > 0 && result.includes('m=video') ? result : sdp;
  } catch {
    return sdp;
  }
}

let RTCViewSub: any = View;
try {
  const webrtc = require('react-native-webrtc');
  if (webrtc.RTCView) RTCViewSub = webrtc.RTCView;
} catch {
  // fallback
}

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
}

interface StreamScreenProps {
  stream: StreamData;
  onClose: () => void;
  chatHeight?: number; // Altura configurable del chat (por defecto 40% de la pantalla)
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
  const [token, setToken] = useState<string | null>(null);
  const [remoteStreamUrl, setRemoteStreamUrl] = useState<string | null>(null);
  const [videoKey, setVideoKey] = useState(0);
  const [streamError, setStreamError] = useState<string | null>(null);
  const videoRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const pcRef = useRef<any>(null);

  const roomId = stream.id;
  const wsUrl = token && roomId
    ? getLivestreamWsUrl({ token, role: 'subscriber', roomId })
    : null;

  const sendWsRef = useRef<(msg: SignalingMessage) => void>(() => {});
  const closeWsRef = useRef<() => void>(() => {});
  const iceQueueRef = useRef<string[]>([]);
  const isMountedRef = useRef(true);
  const combinedStreamRef = useRef<any>(null);
  const lastVideoTrackIdRef = useRef<string | null>(null);

  const resetConnection = useCallback(() => {
    lastVideoTrackIdRef.current = null;
    combinedStreamRef.current = null;
    iceQueueRef.current = [];
    setRemoteStreamUrl(null);
    setVideoKey((k) => k + 1);
    const pc = pcRef.current;
    pcRef.current = null;
    if (pc) {
      try {
        pc.close();
      } catch (_) {}
    }
    closeWsRef.current();
  }, []);

  const handleClose = useCallback(() => {
    resetConnection();
    onClose();
  }, [resetConnection, onClose]);

  const handleSignalingMessage = useCallback((msg: SignalingMessage) => {
    if (msg.type === 'error') {
      const detail = msg.detail || msg.sdp || '';
      const message = detail === 'no_media'
        ? 'El vendedor aún no está transmitiendo. Espera unos segundos e intenta de nuevo.'
        : (detail || 'No se pudo conectar.');
      if (isMountedRef.current) setStreamError(message);
      return;
    }
    if (msg.type === 'offer' && msg.sdp) {
      const webrtc = require('react-native-webrtc');
      if (pcRef.current) {
        try {
          pcRef.current.close();
        } catch (_) {}
        pcRef.current = null;
      }
      lastVideoTrackIdRef.current = null;
      combinedStreamRef.current = null;
      iceQueueRef.current = [];
      setRemoteStreamUrl(null);
      const pcNew = new webrtc.RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pcNew;
      try {
        combinedStreamRef.current = new webrtc.MediaStream();
      } catch {
        combinedStreamRef.current = null;
      }
      pcNew.ontrack = (e: any) => {
        if (!isMountedRef.current) return;
        try {
          const track = e.track;
          if (!track || track.kind !== 'video') return;
          const trackId = track.id || track._id || null;
          if (trackId) {
            if (lastVideoTrackIdRef.current && lastVideoTrackIdRef.current !== trackId) {
              setVideoKey((k) => k + 1);
            }
            lastVideoTrackIdRef.current = trackId;
            if (typeof track.onended === 'function') {
              track.onended = () => {
                if (lastVideoTrackIdRef.current === trackId && isMountedRef.current) {
                  lastVideoTrackIdRef.current = null;
                  setRemoteStreamUrl(null);
                  setVideoKey((k) => k + 1);
                }
              };
            }
          }
          let url: string | null = null;
          const s = e.streams && e.streams[0];
          if (s && typeof s.toURL === 'function') {
            try {
              const u = s.toURL();
              if (typeof u === 'string' && u.length > 0) url = u;
            } catch (_) {}
          }
          if (!url) {
            const combined = combinedStreamRef.current;
            if (combined && typeof combined.addTrack === 'function' && typeof combined.toURL === 'function') {
              try {
                combined.addTrack(track);
                const u = combined.toURL();
                if (typeof u === 'string' && u.length > 0) url = u;
              } catch (_) {}
            }
          }
          if (url && isMountedRef.current) {
            setRemoteStreamUrl(url);
            setVideoKey((k) => k + 1);
          }
        } catch (_) {
          if (isMountedRef.current) setStreamError('Error al recibir el stream');
        }
      };
      pcNew.onicecandidate = (e: any) => {
        if (e.candidate) sendWsRef.current({ type: 'ice', candidate: e.candidate.candidate });
      };
      pcNew.setRemoteDescription({ type: 'offer', sdp: msg.sdp }).then(() => {
        iceQueueRef.current.forEach((c) => {
          pcNew.addIceCandidate({ candidate: c, sdpMid: null, sdpMLineIndex: null }).catch(() => {});
        });
        iceQueueRef.current = [];
        return pcNew.createAnswer();
      }).then((answer: any) => {
        let sdp = answer.sdp || '';
        try {
          const modified = preferH264InVideoSDP(sdp);
          if (modified && modified.length > 50) sdp = modified;
        } catch (_) {}
        const desc = { type: answer.type, sdp };
        return pcNew.setLocalDescription(desc).then(() => ({ ...answer, sdp }));
      }).then((answer: any) => {
        sendWsRef.current({ type: 'answer', sdp: answer.sdp });
      }).catch((err: any) => {
        if (isMountedRef.current) setStreamError(err?.message || 'Error WebRTC');
      });
    }
    if (msg.type === 'ice' && msg.candidate) {
      if (pcRef.current) {
        pcRef.current.addIceCandidate({ candidate: msg.candidate, sdpMid: null, sdpMLineIndex: null }).catch(() => {});
      } else {
        iceQueueRef.current.push(msg.candidate);
      }
    }
  }, []);

  const { send: sendWs, close: closeWs, error: signalingError } = useLivestreamSignaling(wsUrl, handleSignalingMessage);
  sendWsRef.current = sendWs;
  closeWsRef.current = closeWs;
  useEffect(() => {
    if (signalingError && isMountedRef.current) setStreamError(signalingError);
  }, [signalingError]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await storage.getAccessToken();
        if (!cancelled) setToken(t || null);
      } catch {
        if (!cancelled) setStreamError('No se pudo obtener la sesión');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      resetConnection();
    };
  }, [resetConnection]);

  // Timeout: si tras 20 s no hay video, mostrar mensaje
  useEffect(() => {
    if (!wsUrl || remoteStreamUrl) return;
    const t = setTimeout(() => {
      setStreamError((prev) => (prev ? prev : 'No se pudo conectar. ¿El vendedor está transmitiendo?'));
    }, 20000);
    return () => clearTimeout(t);
  }, [wsUrl, remoteStreamUrl]);

  useEffect(() => {
    const timer = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timer);
  }, [showControls]);

  // Exponer funciones para testing desde la consola
  useEffect(() => {
    // Solo en desarrollo, exponer funciones globales para testing
    if (__DEV__) {
      const globalObj = global as any;
      // showBidInterface ahora funciona como toggle: si está abierta, la cierra; si está cerrada, la abre
      globalObj.showBidInterface = () => setShowBidInterface(prev => !prev);
      globalObj.hideBidInterface = () => setShowBidInterface(false);
      globalObj.toggleBidInterface = () => setShowBidInterface(prev => !prev);
      globalObj.setBidAmount = (amount: number) => setBidAmount(amount);
      
      console.log('🎯 Funciones de testing disponibles:');
      console.log('  - showBidInterface() - Mostrar/Ocultar interfaz de ofertas (toggle)');
      console.log('  - hideBidInterface() - Ocultar interfaz de ofertas');
      console.log('  - toggleBidInterface() - Alternar interfaz de ofertas');
      console.log('  - setBidAmount(10) - Establecer monto de oferta');
    }

    return () => {
      // Limpiar funciones globales al desmontar
      if (__DEV__) {
        const globalObj = global as any;
        delete globalObj.showBidInterface;
        delete globalObj.hideBidInterface;
        delete globalObj.toggleBidInterface;
        delete globalObj.setBidAmount;
      }
    };
  }, []);

  const handleScreenPress = () => {
    setShowControls(!showControls);
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleToggleChat = () => {
    setShowChat(!showChat);
  };

  const handleDecreaseBid = () => {
    if (bidAmount > 1) {
      setBidAmount(bidAmount - 1);
    }
  };

  const handleIncreaseBid = () => {
    setBidAmount(bidAmount + 1);
  };

  const handleSubmitBid = () => {
    // Crear mensaje de oferta en el chat
    const bidMessage: ChatMessage = {
      id: Date.now().toString(),
      username: 'Tú',
      message: `Oferta enviada: $${bidAmount}`,
      timestamp: 'ahora',
    };
    setMessages([...messages, bidMessage]);
    
    // Aquí se enviaría la oferta al backend
    console.log(`Oferta enviada: $${bidAmount}`);
    
    // Scroll al final del chat
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    // Ocultar la interfaz de ofertas después de enviar (opcional)
    // setShowBidInterface(false);
  };

  const handleSendMessage = () => {
    if (messageText.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        username: 'Tú',
        message: messageText.trim(),
        timestamp: 'ahora',
      };
      setMessages([...messages, newMessage]);
      setMessageText('');
      // Scroll al final de la lista
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleToggleChatSize = () => {
    // Alternar entre las 3 posiciones: chico -> mediano -> alto -> chico
    if (chatSize === 'small') {
      setChatSize('medium');
    } else if (chatSize === 'medium') {
      setChatSize('large');
    } else {
      setChatSize('small');
    }
  };

  // Definir las alturas según el tamaño seleccionado
  const getChatHeight = (): number => {
    switch (chatSize) {
      case 'small':
        return SCREEN_HEIGHT * 0.25; // 25% de la altura
      case 'medium':
        return SCREEN_HEIGHT * 0.4; // 40% de la altura
      case 'large':
        return SCREEN_HEIGHT * 0.6; // 60% de la altura
      default:
        return SCREEN_HEIGHT * 0.4;
    }
  };

  const getChatSizeIcon = () => {
    switch (chatSize) {
      case 'small':
        return <ChevronUp size={18} color="#ffffff" />;
      case 'medium':
        return <Maximize2 size={18} color="#ffffff" />;
      case 'large':
        return <ChevronDown size={18} color="#ffffff" />;
      default:
        return <Maximize2 size={18} color="#ffffff" />;
    }
  };

  if (streamError) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text variant="h3" className="text-white mb-2">Error al conectar</Text>
        <Text variant="body" className="text-white mb-4">{streamError}</Text>
        <TouchableOpacity onPress={handleClose} style={{ padding: 12, backgroundColor: '#333' }}>
          <Text variant="body" className="text-white">Cerrar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!token) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text variant="body" className="text-white mt-4">Conectando al stream...</Text>
      </View>
    );
  }

  const useWebRTC = !!roomId;
  const videoUrl = stream.streamUrl || '';

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <View style={styles.videoContainer}>
        {useWebRTC && remoteStreamUrl && String(remoteStreamUrl).length > 0 ? (
          <RTCViewSub
            key={`webrtc-remote-${videoKey}`}
            streamURL={String(remoteStreamUrl)}
            style={styles.video}
            objectFit="cover"
          />
        ) : useWebRTC ? (
          <View style={[styles.video, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color="#fff" />
            <Text variant="body" className="text-white mt-2">Cargando stream...</Text>
          </View>
        ) : videoUrl ? (
          <Video
            ref={videoRef}
            source={{ uri: videoUrl }}
            style={styles.video}
            resizeMode="cover"
            repeat={true}
            paused={false}
            muted={isMuted}
            controls={false}
            playInBackground={false}
            playWhenInactive={false}
            ignoreSilentSwitch="ignore"
          />
        ) : (
          <View style={[styles.video, { justifyContent: 'center', alignItems: 'center' }]}>
            <Text variant="body" className="text-white">Sin señal</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.videoOverlay}
          activeOpacity={1}
          onPress={handleScreenPress}
        />

        {/* Interfaz de ofertas - Se muestra cuando el backend lo indica */}
        {showBidInterface && (
          <View style={styles.bidInterface}>
            <View style={styles.bidContainer}>
              <TouchableOpacity
                style={styles.bidButton}
                onPress={handleDecreaseBid}
                activeOpacity={0.7}
              >
                <Minus size={24} color="#ffffff" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.bidAmountButton}
                onPress={handleSubmitBid}
                activeOpacity={0.8}
              >
                <Text style={styles.bidAmountText}>${bidAmount}</Text>
                <Text style={styles.bidSubmitText}>Ofertar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.bidButton}
                onPress={handleIncreaseBid}
                activeOpacity={0.7}
              >
                <Plus size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Controles siempre visibles - Superior */}
        <View style={styles.alwaysVisibleTop}>
          {/* Botón cerrar */}
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
          
          {/* Badge LIVE */}
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>EN VIVO</Text>
          </View>
        </View>

        {/* Controles siempre visibles - Inferior */}
        <View style={styles.alwaysVisibleBottom}>
          {/* Nombre del streamer */}
          <View style={styles.sellerNameContainer}>
            <Text variant="h3" className="text-white font-bold">
              {stream.sellerName}
            </Text>
            {/* Estadísticas siempre visibles */}
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

          {/* Botones siempre visibles */}
          <View style={styles.alwaysVisibleButtons}>
            {/* Botón de sonido - siempre visible */}
            <TouchableOpacity 
              style={styles.soundButton} 
              activeOpacity={0.7}
              onPress={handleToggleMute}
            >
              {isMuted ? (
                <VolumeX size={24} color="#ffffff" />
              ) : (
                <Volume2 size={24} color="#ffffff" />
              )}
            </TouchableOpacity>
            
            {/* Botón para mostrar/ocultar chat */}
            <TouchableOpacity 
              style={styles.soundButton} 
              activeOpacity={0.7}
              onPress={handleToggleChat}
            >
              {showChat ? (
                <MessageSquareOff size={24} color="#ffffff" />
              ) : (
                <MessageSquare size={24} color="#ffffff" />
              )}
            </TouchableOpacity>
            
            {/* Botón Me gusta - siempre visible */}
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
              <Heart size={24} color="#ffffff" />
              <Text style={styles.actionButtonText}>Me gusta</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Chat sobre el video - Al pie */}
        {showChat && (
          <View style={[styles.chatContainer, { height: getChatHeight() }]}>
          <View style={styles.chatHeader}>
            <Text variant="body" className="text-white font-semibold">
              Chat en vivo
            </Text>
            <TouchableOpacity
              style={styles.chatSizeButton}
              onPress={handleToggleChatSize}
              activeOpacity={0.7}
            >
              {getChatSizeIcon()}
            </TouchableOpacity>
          </View>
          
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
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
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }}
          />
          
          {/* Input y botón de enviar */}
          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#9ca3af"
              value={messageText}
              onChangeText={setMessageText}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendMessage}
              activeOpacity={0.7}
            >
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
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000000',
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  alwaysVisibleTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 3,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    marginRight: 6,
  },
  liveText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  alwaysVisibleBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 16,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    zIndex: 3,
  },
  sellerNameContainer: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  alwaysVisibleButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  soundButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  chatContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: Platform.OS === 'ios' ? 140 : 120, // Arriba de los controles inferiores
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 4,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  chatSizeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexGrow: 1,
  },
  chatMessage: {
    marginBottom: 8,
  },
  messageBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    padding: 8,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageUsername: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  messageTimestamp: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
  },
  messageText: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18,
  },
  chatInputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 14,
    maxHeight: 80,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bidInterface: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 200 : 180,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
    paddingHorizontal: 16,
  },
  bidContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    padding: 8,
  },
  bidButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bidAmountButton: {
    minWidth: 120,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  bidAmountText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  bidSubmitText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
