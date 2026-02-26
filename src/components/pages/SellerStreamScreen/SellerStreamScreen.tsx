/**
 * SellerStreamScreen
 * Pantalla para el streamer que está transmitiendo en vivo.
 * Conecta al servidor de livestream (WebRTC SFU) como publisher y envía cámara/mic.
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
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { Text } from '../../atoms/Text';
import { Send, MessageSquare, MessageSquareOff, ChevronUp, ChevronDown, Maximize2, Square, ArrowLeft, FlipHorizontal } from 'lucide-react-native';
import type { StreamConfig } from '../StreamConfigScreen';
import { useAuth } from '../../../hooks/useAuth';
import { storage } from '../../../utils/storage';
import { getLivestreamWsUrl, uploadRoomSnapshot } from '../../../api/livestreamApi';
import { useLivestreamSignaling, type SignalingMessage } from '../../../hooks/useLivestreamSignaling';

let RTCView: any = View;
try {
  const webrtc = require('react-native-webrtc');
  if (webrtc.RTCView) RTCView = webrtc.RTCView;
} catch {
  // react-native-webrtc no instalado: fallback a View
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

/**
 * Reordena la SDP para preferir H.264 en video (si está disponible).
 * No transcodifica: solo cambia la preferencia en la oferta.
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
  const [localStreamUrl, setLocalStreamUrl] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const cameraRef = useRef<Camera>(null);
  const previewRef = useRef<View>(null);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const pcRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const snapshotSentRef = useRef<string | null>(null);

  const sellerName = streamConfig?.title || user?.name || 'Streamer';
  const wsUrl = token
    ? getLivestreamWsUrl({ token, role: 'publisher', sellerName })
    : null;

  const handleSignalingMessage = useCallback((msg: SignalingMessage) => {
    const pc = pcRef.current;
    if (!pc) return;
    if (msg.type === 'answer' && msg.sdp) {
      pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp }).catch(() => {});
    }
    if (msg.type === 'ice' && msg.candidate) {
      pc.addIceCandidate({ candidate: msg.candidate, sdpMid: null, sdpMLineIndex: null }).catch(() => {});
    }
  }, []);

  const { isOpen: wsOpen, roomId, error: signalingError, send: sendWs, close: closeWs } = useLivestreamSignaling(
    wsUrl,
    handleSignalingMessage,
  );
  const sendWsRef = useRef(sendWs);
  sendWsRef.current = sendWs;

  useEffect(() => {
    return () => {
      closeWs();
    };
  }, [closeWs]);

  const captureAndUploadSnapshot = useCallback(
    async (room: string) => {
      if (!room) return;
      try {
        let uri: string | null = null;
        if (previewRef.current && localStreamUrl) {
          try {
            const tmp = await captureRef(previewRef, { format: 'jpg', quality: 0.6, result: 'tmpfile' });
            uri = typeof tmp === 'string' ? tmp : null;
          } catch {}
        }
        if (!uri && cameraRef.current) {
          try {
            const snap = await cameraRef.current.takeSnapshot({ quality: 60 });
            uri = snap?.path || null;
          } catch {}
        }
        if (!uri) return;
        const normalized = uri.startsWith('file://') ? uri : `file://${uri}`;
        const form = new FormData();
        form.append('file', {
          uri: normalized,
          type: 'image/jpeg',
          name: `${room}.jpg`,
        } as any);
        await uploadRoomSnapshot(room, form);
        snapshotSentRef.current = room;
      } catch {
        // ignore snapshot errors
      }
    },
    [localStreamUrl],
  );

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
    if (!wsOpen || !roomId) return;
    let pc: any = null;
    let stream: any = null;
    const webrtc = require('react-native-webrtc');
    const { RTCPeerConnection, mediaDevices } = webrtc;
    const send = (msg: SignalingMessage) => sendWsRef.current(msg);
    (async () => {
      try {
        stream = await mediaDevices.getUserMedia({ audio: true, video: true });
        if (!stream) throw new Error('No stream');
        pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;
        streamRef.current = stream;
        pc.onicecandidate = (e: any) => {
          if (e.candidate) send({ type: 'ice', candidate: e.candidate.candidate });
        };
        stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));
        const offer = await pc.createOffer();
        let sdp = offer?.sdp || '';
        try {
          const modified = preferH264InVideoSDP(sdp);
          if (modified && modified.length > 50) sdp = modified;
        } catch {}
        await pc.setLocalDescription({ type: offer.type, sdp });
        if (typeof sdp === 'string' && sdp.length > 0) {
          send({ type: 'offer', sdp });
        } else {
          setStreamError('Error al crear la oferta WebRTC');
        }
        if (roomId) {
          await captureAndUploadSnapshot(roomId);
        }
        if (stream.toURL) setLocalStreamUrl(stream.toURL());
      } catch (e: any) {
        setStreamError(e?.message || 'Error al iniciar cámara');
      }
    })();
    return () => {
      pcRef.current = null;
      if (pc) pc.close();
      if (stream) stream.getTracks().forEach((t: any) => t.stop());
      streamRef.current = null;
      setLocalStreamUrl(null);
    };
  }, [wsOpen, roomId]);

  useEffect(() => {
    if (!roomId || !localStreamUrl) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await captureAndUploadSnapshot(roomId);
    };
    tick();
    const interval = setInterval(tick, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [roomId, localStreamUrl, captureAndUploadSnapshot]);

  const handleEndStream = () => {
    closeWs();
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t: any) => t.stop());
      streamRef.current = null;
    }
    setLocalStreamUrl(null);
    Alert.alert(
      'Finalizar Stream',
      '¿Seguro que deseas finalizar el stream?',
      [{ text: 'Cancelar', style: 'cancel' }, { text: 'Finalizar', style: 'destructive', onPress: onEndStream }],
    );
  };

  const { hasPermission, requestPermission } = useCameraPermission();
  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');
  const device = cameraPosition === 'front' ? frontDevice : backDevice;

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  const streamFailing = streamError || signalingError;
  const webrtcReady = !!localStreamUrl;

  const handleToggleChat = () => {
    setShowChat(!showChat);
  };

  const handleToggleChatSize = () => {
    if (chatSize === 'small') {
      setChatSize('medium');
    } else if (chatSize === 'medium') {
      setChatSize('large');
    } else {
      setChatSize('small');
    }
  };

  const getChatHeight = () => {
    switch (chatSize) {
      case 'small':
        return SCREEN_HEIGHT * 0.25;
      case 'medium':
        return SCREEN_HEIGHT * 0.4;
      case 'large':
        return SCREEN_HEIGHT * 0.6;
      default:
        return SCREEN_HEIGHT * 0.4;
    }
  };

  const getChatSizeIcon = () => {
    switch (chatSize) {
      case 'small':
        return <ChevronUp size={16} color="#ffffff" />;
      case 'medium':
        return <Maximize2 size={16} color="#ffffff" />;
      case 'large':
        return <ChevronDown size={16} color="#ffffff" />;
      default:
        return <Maximize2 size={16} color="#ffffff" />;
    }
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
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleToggleCamera = async () => {
    const nextPosition = cameraPosition === 'front' ? 'back' : 'front';
    setCameraPosition(nextPosition);

    const stream = streamRef.current;
    const pc = pcRef.current;
    if (!stream || !pc) return;

    const currentVideoTrack = stream.getVideoTracks?.()[0];
    if (currentVideoTrack && typeof currentVideoTrack._switchCamera === 'function') {
      try {
        currentVideoTrack._switchCamera();
        return;
      } catch {
        // fallback to replaceTrack flow
      }
    }

    try {
      const webrtc = require('react-native-webrtc');
      const { mediaDevices } = webrtc;
      const newStream = await mediaDevices.getUserMedia({
        video: { facingMode: nextPosition === 'front' ? 'user' : 'environment' },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks?.()[0];
      if (!newVideoTrack) throw new Error('No video track');

      const sender = pc.getSenders?.().find((s: any) => s.track && s.track.kind === 'video');
      if (sender?.replaceTrack) {
        await sender.replaceTrack(newVideoTrack);
      }

      if (currentVideoTrack) {
        try {
          stream.removeTrack?.(currentVideoTrack);
          currentVideoTrack.stop?.();
        } catch {}
      }
      stream.addTrack?.(newVideoTrack);
      if (stream.toURL) setLocalStreamUrl(stream.toURL());
    } catch (e) {
      setStreamError('No se pudo cambiar la cámara');
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onEndStream}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text variant="h3" className="text-white text-center mb-4">
          Permisos de Cámara Requeridos
        </Text>
        <Text variant="body" className="text-white text-center mb-6">
          Necesitamos acceso a tu cámara para transmitir en vivo
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
          activeOpacity={0.8}
        >
          <Text variant="body" className="text-white font-semibold">
            Solicitar Permisos
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Verificar si hay al menos una cámara disponible
  if (!frontDevice && !backDevice) {
    return (
      <View style={styles.permissionContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onEndStream}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text variant="h3" className="text-white text-center mb-4">
          Cámara no disponible
        </Text>
        <Text variant="body" className="text-white text-center mb-6">
          No se pudo acceder a la cámara del dispositivo
        </Text>
        <TouchableOpacity
          style={styles.backButtonText}
          onPress={onEndStream}
          activeOpacity={0.8}
        >
          <Text variant="body" className="text-white font-semibold">
            Volver
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (streamFailing) {
    return (
      <View style={styles.permissionContainer}>
        <TouchableOpacity style={styles.backButton} onPress={onEndStream} activeOpacity={0.7}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text variant="h3" className="text-white text-center mb-4">Error de transmisión</Text>
        <Text variant="body" className="text-white text-center mb-6">{streamError || signalingError}</Text>
        <TouchableOpacity style={styles.backButtonText} onPress={onEndStream} activeOpacity={0.8}>
          <Text variant="body" className="text-white font-semibold">Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!token) {
    return (
      <View style={styles.permissionContainer}>
        <TouchableOpacity style={styles.backButton} onPress={onEndStream} activeOpacity={0.7}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <ActivityIndicator size="large" color="#fff" />
        <Text variant="body" className="text-white text-center mt-4">Conectando...</Text>
      </View>
    );
  }

  const activeDevice = device || (cameraPosition === 'front' ? backDevice : frontDevice);

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      {webrtcReady && localStreamUrl ? (
        <View ref={previewRef} style={styles.camera}>
          <RTCView
            streamURL={localStreamUrl}
            style={StyleSheet.absoluteFill}
            objectFit="cover"
          />
        </View>
      ) : (
        <>
          {activeDevice && (
            <Camera
              ref={cameraRef}
              style={styles.camera}
              device={activeDevice}
              isActive={true}
              video={true}
              audio={true}
            />
          )}
          {!activeDevice && (
            <View style={styles.camera}>
              <ActivityIndicator size="large" color="#fff" style={StyleSheet.absoluteFill} />
              <Text variant="body" className="text-white text-center">Preparando cámara...</Text>
            </View>
          )}
        </>
      )}

      {/* Controles siempre visibles - Superior */}
      <View style={styles.topControls}>
        {/* Botón finalizar stream */}
        <TouchableOpacity
          onPress={handleEndStream}
          style={styles.endStreamButton}
          activeOpacity={0.7}
        >
          <Square size={20} color="#ffffff" />
          <Text style={styles.endStreamText}>Finalizar</Text>
        </TouchableOpacity>
        
        {/* Badge LIVE */}
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>EN VIVO</Text>
        </View>
      </View>

      {/* Controles siempre visibles - Inferior */}
      <View style={styles.bottomControls}>
        {/* Botón para cambiar de cámara */}
        <TouchableOpacity 
          style={styles.cameraToggleButton} 
          activeOpacity={0.7}
          onPress={handleToggleCamera}
        >
          <FlipHorizontal size={24} color="#ffffff" />
        </TouchableOpacity>
        
        {/* Botón de chat */}
        <TouchableOpacity 
          style={styles.chatToggleButton} 
          activeOpacity={0.7}
          onPress={handleToggleChat}
        >
          {showChat ? (
            <MessageSquareOff size={24} color="#ffffff" />
          ) : (
            <MessageSquare size={24} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Chat sobre el video - Al pie */}
      {showChat && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.chatContainer, { height: getChatHeight() }]}
        >
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
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  permissionButton: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  backButtonText: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  topControls: {
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
  endStreamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  endStreamText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
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
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 16,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    zIndex: 3,
  },
  cameraToggleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatToggleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 70,
    left: 16,
    right: 16,
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
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  chatInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: '#ffffff',
    fontSize: 14,
    marginRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
