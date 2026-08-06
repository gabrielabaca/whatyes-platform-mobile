#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTViewManager.h>
#import <UIKit/UIKit.h>
#import <AVFoundation/AVFoundation.h>
#import <ReplayKit/ReplayKit.h>
#import <AmazonIVSBroadcast/AmazonIVSBroadcast.h>

// Bridge de Amazon IVS Real-Time (Stages).
//
// Dos slots de stage:
// - MAIN: el vivo activo (el seller publica o el viewer mira, con audio).
// - PREVIEW: precalienta el stage del siguiente slide del feed (subscribe con
//   audio en gain 0). joinAsViewer con el token del preview lo PROMUEVE a main
//   sin reconectar: el video del próximo vivo aparece al instante al swipear.
//
// Espejo del contrato de KinesisWebRTCNative: start/stop, mute de mic,
// pausa de video y flip de cámara.

// Interfaz del módulo declarada antes del coordinator (que le reenvía eventos).
@interface IvsStageModule : RCTEventEmitter <RCTBridgeModule>
- (void)sendIvsEvent:(NSString *)event body:(id)body;
@end

#pragma mark - Coordinator

typedef NS_ENUM(NSInteger, IvsViewSlot) {
  IvsViewSlotLocal,
  IvsViewSlotRemote,
  IvsViewSlotPreview,
};

@interface IvsStageCoordinator : NSObject <IVSStageStrategy, IVSStageRenderer>

@property (nonatomic, weak) IvsStageModule *emitter;
@property (nonatomic, strong, nullable) IVSDeviceDiscovery *discovery;

// Slot MAIN
@property (nonatomic, strong, nullable) IVSStage *mainStage;
@property (nonatomic, copy, nullable) NSString *mainToken;
@property (nonatomic, assign) BOOL publishing;
@property (nonatomic, strong, nullable) IVSLocalStageStream *cameraStream;
@property (nonatomic, strong, nullable) IVSLocalStageStream *micStream;
@property (nonatomic, strong, nullable) IVSStageStream *remoteVideoStream;
@property (nonatomic, strong, nullable) IVSStageStream *remoteAudioStream;
@property (nonatomic, assign) BOOL remoteAudioMuted;

// Slot PREVIEW (siguiente slide del feed / peek del home). El audio arranca
// SIEMPRE muteado; el peek del home lo activa explícito.
@property (nonatomic, strong, nullable) IVSStage *previewStage;
@property (nonatomic, copy, nullable) NSString *previewToken;
@property (nonatomic, strong, nullable) IVSStageStream *previewVideoStream;
@property (nonatomic, strong, nullable) IVSStageStream *previewAudioStream;
@property (nonatomic, assign) BOOL previewAudioMuted;

@property (nonatomic, copy, nullable) void (^localPreviewListener)(id<IVSImageDevice> _Nullable device);
@property (nonatomic, copy, nullable) void (^remoteVideoListener)(id<IVSImageDevice> _Nullable device);
@property (nonatomic, copy, nullable) void (^previewVideoListener)(id<IVSImageDevice> _Nullable device);

+ (instancetype)shared;

@end

@implementation IvsStageCoordinator

+ (instancetype)shared {
  static IvsStageCoordinator *instance;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{ instance = [IvsStageCoordinator new]; });
  return instance;
}

- (void)setLocalPreviewListener:(void (^)(id<IVSImageDevice> _Nullable))listener {
  _localPreviewListener = [listener copy];
  if (listener) listener((id<IVSImageDevice>)self.cameraStream.device);
}

- (void)setRemoteVideoListener:(void (^)(id<IVSImageDevice> _Nullable))listener {
  _remoteVideoListener = [listener copy];
  if (listener) listener((id<IVSImageDevice>)self.remoteVideoStream.device);
}

- (void)setPreviewVideoListener:(void (^)(id<IVSImageDevice> _Nullable))listener {
  _previewVideoListener = [listener copy];
  if (listener) listener((id<IVSImageDevice>)self.previewVideoStream.device);
}

#pragma mark Devices

// En iOS la cámara es UN device multiplexado (IVSCamera / IVSMultiSourceDevice):
// front/back son input sources del mismo device, no devices separados.
- (nullable id<IVSDevice>)findCameraDevice {
  for (id<IVSDevice> device in [self.discovery listLocalDevices]) {
    if (device.descriptor.type == IVSDeviceTypeCamera) return device;
  }
  return nil;
}

// Selecciona la fuente (frontal/trasera) del device de cámara. Cambio en
// caliente: el stream y el preview siguen siendo los mismos (sin parpadeo).
- (void)applyCameraFacing:(NSString *)facingMode toCamera:(id<IVSDevice>)cameraDevice {
  if (![cameraDevice conformsToProtocol:@protocol(IVSMultiSourceDevice)]) return;
  IVSDevicePosition wanted = [facingMode isEqualToString:@"environment"]
      ? IVSDevicePositionBack
      : IVSDevicePositionFront;
  id<IVSMultiSourceDevice> multi = (id<IVSMultiSourceDevice>)cameraDevice;
  for (IVSDeviceDescriptor *source in [multi listAvailableInputSources]) {
    if (source.position != wanted) continue;
    [multi setPreferredInputSource:source
                        onComplete:^(NSError *_Nullable error) {
                          if (error) {
                            NSLog(@"[IvsStage] setPreferredInputSource: %@",
                                  error.localizedDescription);
                          }
                        }];
    return;
  }
  NSLog(@"[IvsStage] sin input source para facing %@", facingMode);
}

- (nullable id<IVSDevice>)findMicrophone {
  for (id<IVSDevice> device in [self.discovery listLocalDevices]) {
    if (device.descriptor.type == IVSDeviceTypeMicrophone) return device;
  }
  return nil;
}

#pragma mark Join / leave

- (BOOL)joinAsPublisherWithToken:(NSString *)token
                      facingMode:(NSString *)facingMode
                           error:(NSError **)error {
  [self leaveAll];
  // El audio manager debe configurarse antes de tocar devices o el stage.
  [[IVSStageAudioManager sharedInstance] setPreset:IVSStageAudioManagerUseCasePresetVideoChat];
  self.publishing = YES;
  self.discovery = [[IVSDeviceDiscovery alloc] init];
  id<IVSDevice> camera = [self findCameraDevice];
  if (camera) [self applyCameraFacing:facingMode toCamera:camera];
  id<IVSDevice> microphone = [self findMicrophone];
  if (!camera || !microphone) {
    if (error) {
      *error = [NSError errorWithDomain:@"IvsStage"
                                   code:1
                               userInfo:@{NSLocalizedDescriptionKey : @"Sin cámara o micrófono disponible"}];
    }
    return NO;
  }
  self.cameraStream = [[IVSLocalStageStream alloc] initWithDevice:camera];
  self.micStream = [[IVSLocalStageStream alloc] initWithDevice:microphone];
  IVSStage *stage = [self createAndJoinWithToken:token error:error];
  if (!stage) return NO;
  self.mainStage = stage;
  self.mainToken = token;
  if (self.localPreviewListener) self.localPreviewListener((id<IVSImageDevice>)camera);
  return YES;
}

- (BOOL)joinAsViewerWithToken:(NSString *)token error:(NSError **)error {
  // Ya conectados a este stage: solo re-anunciar el estado (los listeners
  // JS pueden haberse registrado después del stream).
  if (self.mainStage && [token isEqualToString:self.mainToken ?: @""]) {
    [self reemitMainState];
    return YES;
  }
  // El token corresponde al stage precalentado: PROMOVER sin reconectar.
  if (self.previewStage && [token isEqualToString:self.previewToken ?: @""]) {
    [self promotePreview];
    return YES;
  }
  [self leaveMain];
  [[IVSStageAudioManager sharedInstance] setPreset:IVSStageAudioManagerUseCasePresetSubscribeOnly];
  self.publishing = NO;
  IVSStage *stage = [self createAndJoinWithToken:token error:error];
  if (!stage) return NO;
  self.mainStage = stage;
  self.mainToken = token;
  return YES;
}

- (BOOL)startPreviewWithToken:(NSString *)token error:(NSError **)error {
  if (self.previewStage && [token isEqualToString:self.previewToken ?: @""]) return YES;
  if (self.mainStage && [token isEqualToString:self.mainToken ?: @""]) return YES;
  [self stopPreview];
  if (!self.mainStage) {
    [[IVSStageAudioManager sharedInstance] setPreset:IVSStageAudioManagerUseCasePresetSubscribeOnly];
  }
  self.previewAudioMuted = YES;
  IVSStage *stage = [self createAndJoinWithToken:token error:error];
  if (!stage) return NO;
  self.previewStage = stage;
  self.previewToken = token;
  return YES;
}

- (void)stopPreview {
  [self.previewStage leave];
  self.previewStage = nil;
  self.previewToken = nil;
  self.previewVideoStream = nil;
  self.previewAudioStream = nil;
  self.previewAudioMuted = YES;
  if (self.previewVideoListener) self.previewVideoListener(nil);
}

// Audio del slot preview (el peek del home lo enciende; el swipe lo deja muteado).
// Setter manual de la property: asignar al IVAR, nunca self.<prop> (recursión).
- (void)setPreviewAudioMuted:(BOOL)muted {
  _previewAudioMuted = muted;
  if ([self.previewAudioStream.device conformsToProtocol:@protocol(IVSAudioDevice)]) {
    [(id<IVSAudioDevice>)self.previewAudioStream.device setGain:muted ? 0.0f : 1.0f];
  }
}

// El stage precalentado pasa a ser el vivo activo (sin reconexión).
- (void)promotePreview {
  [self.mainStage leave];
  self.publishing = NO;
  self.mainStage = self.previewStage;
  self.mainToken = self.previewToken;
  self.remoteVideoStream = self.previewVideoStream;
  self.remoteAudioStream = self.previewAudioStream;
  self.previewStage = nil;
  self.previewToken = nil;
  self.previewVideoStream = nil;
  self.previewAudioStream = nil;
  if (self.previewVideoListener) self.previewVideoListener(nil);
  // Subir el audio (el preview corría en gain 0) y anunciar el video.
  _remoteAudioMuted = NO;
  if ([self.remoteAudioStream.device conformsToProtocol:@protocol(IVSAudioDevice)]) {
    [(id<IVSAudioDevice>)self.remoteAudioStream.device setGain:1.0f];
  }
  [self reemitMainState];
}

- (void)reemitMainState {
  IVSStageStream *video = self.remoteVideoStream;
  if (self.remoteVideoListener) {
    self.remoteVideoListener((id<IVSImageDevice>)video.device);
  }
  if (video) {
    [self emit:@"IvsStage:remoteVideo" body:@{@"participantId" : @"", @"hasVideo" : @YES}];
  }
}

- (nullable IVSStage *)createAndJoinWithToken:(NSString *)token error:(NSError **)error {
  IVSStage *stage = [[IVSStage alloc] initWithToken:token strategy:self error:error];
  if (!stage) return nil;
  [stage addRenderer:self];
  if (![stage joinWithError:error]) return nil;
  return stage;
}

- (void)leaveMain {
  [self.mainStage leave];
  self.mainStage = nil;
  self.mainToken = nil;
  self.remoteVideoStream = nil;
  self.remoteAudioStream = nil;
  _remoteAudioMuted = NO;
  if (self.remoteVideoListener) self.remoteVideoListener(nil);
  if (self.localPreviewListener) self.localPreviewListener(nil);
  self.cameraStream = nil;
  self.micStream = nil;
  if (!self.previewStage) self.discovery = nil;
  self.publishing = NO;
}

- (void)leaveAll {
  [self stopPreview];
  [self leaveMain];
}

#pragma mark Controles

- (void)setVideoMuted:(BOOL)muted {
  [self.cameraStream setMuted:muted];
  [self.mainStage refreshStrategy];
}

- (void)setMicMuted:(BOOL)muted {
  [self.micStream setMuted:muted];
  [self.mainStage refreshStrategy];
}

// Mute local del audio remoto (botón de silencio del viewer): gain 0/1.
// Override del setter de la property: asignar al IVAR (self.remoteAudioMuted
// acá sería este mismo setter → recursión infinita → stack overflow).
- (void)setRemoteAudioMuted:(BOOL)muted {
  _remoteAudioMuted = muted;
  if ([self.remoteAudioStream.device conformsToProtocol:@protocol(IVSAudioDevice)]) {
    [(id<IVSAudioDevice>)self.remoteAudioStream.device setGain:muted ? 0.0f : 1.0f];
  }
}

- (BOOL)switchCameraFacing:(NSString *)facingMode error:(NSError **)error {
  id<IVSDevice> camera = (id<IVSDevice>)self.cameraStream.device;
  if (!camera) {
    if (error) {
      *error = [NSError errorWithDomain:@"IvsStage"
                                   code:2
                               userInfo:@{NSLocalizedDescriptionKey : @"Cámara no disponible"}];
    }
    return NO;
  }
  // Mismo device y mismo stream: solo cambia la fuente (nada que re-publicar).
  [self applyCameraFacing:facingMode toCamera:camera];
  return YES;
}

#pragma mark IVSStageStrategy (compartida por ambos slots)

- (NSArray<IVSLocalStageStream *> *)stage:(IVSStage *)stage
          streamsToPublishForParticipant:(IVSParticipantInfo *)participant {
  if (!self.publishing || stage != self.mainStage) return @[];
  NSMutableArray *streams = [NSMutableArray array];
  if (self.cameraStream) [streams addObject:self.cameraStream];
  if (self.micStream) [streams addObject:self.micStream];
  return streams;
}

- (BOOL)stage:(IVSStage *)stage shouldPublishParticipant:(IVSParticipantInfo *)participant {
  return self.publishing && stage == self.mainStage;
}

- (IVSStageSubscribeType)stage:(IVSStage *)stage
    shouldSubscribeToParticipant:(IVSParticipantInfo *)participant {
  if (self.publishing && stage == self.mainStage) return IVSStageSubscribeTypeNone;
  return IVSStageSubscribeTypeAudioVideo;
}

#pragma mark IVSStageRenderer (distingue slot por identidad del stage)

- (void)stage:(IVSStage *)stage
    didChangeConnectionState:(IVSStageConnectionState)connectionState
                   withError:(nullable NSError *)error;
{
  if (stage == self.previewStage) {
    // El preview cae en silencio: al swipear, joinAsViewer reconecta normal.
    if (connectionState == IVSStageConnectionStateDisconnected) [self stopPreview];
    return;
  }
  if (stage != self.mainStage) return;
  NSString *state = @"DISCONNECTED";
  if (connectionState == IVSStageConnectionStateConnecting) state = @"CONNECTING";
  if (connectionState == IVSStageConnectionStateConnected) state = @"CONNECTED";
  NSMutableDictionary *payload = [NSMutableDictionary dictionaryWithObject:state forKey:@"state"];
  if (error) payload[@"error"] = error.localizedDescription;
  [self emit:@"IvsStage:connectionState" body:payload];
}

- (void)stage:(IVSStage *)stage
    participant:(IVSParticipantInfo *)participant
  didAddStreams:(NSArray<IVSStageStream *> *)streams {
  if (participant.isLocal) return;
  if (stage == self.previewStage) {
    for (IVSStageStream *stream in streams) {
      if ([stream.device conformsToProtocol:@protocol(IVSAudioDevice)]) {
        self.previewAudioStream = stream;
        // Muteado por default; el peek del home lo enciende explícito.
        [(id<IVSAudioDevice>)stream.device setGain:self.previewAudioMuted ? 0.0f : 1.0f];
      } else if ([stream.device conformsToProtocol:@protocol(IVSImageDevice)] &&
                 !self.previewVideoStream) {
        self.previewVideoStream = stream;
        if (self.previewVideoListener) {
          self.previewVideoListener((id<IVSImageDevice>)stream.device);
        }
      }
    }
    return;
  }
  if (stage != self.mainStage) return;
  BOOL addedVideo = NO;
  for (IVSStageStream *stream in streams) {
    if ([stream.device conformsToProtocol:@protocol(IVSAudioDevice)]) {
      self.remoteAudioStream = stream;
      [(id<IVSAudioDevice>)stream.device setGain:self.remoteAudioMuted ? 0.0f : 1.0f];
      continue;
    }
    if (![stream.device conformsToProtocol:@protocol(IVSImageDevice)] || addedVideo) continue;
    addedVideo = YES;
    self.remoteVideoStream = stream;
    if (self.remoteVideoListener) self.remoteVideoListener((id<IVSImageDevice>)stream.device);
    [self emit:@"IvsStage:remoteVideo"
          body:@{@"participantId" : participant.participantId ?: @"", @"hasVideo" : @YES}];
  }
}

- (void)stage:(IVSStage *)stage
      participant:(IVSParticipantInfo *)participant
  didRemoveStreams:(NSArray<IVSStageStream *> *)streams {
  if (participant.isLocal) return;
  if (stage == self.previewStage) {
    if ([streams containsObject:self.previewVideoStream]) {
      self.previewVideoStream = nil;
      if (self.previewVideoListener) self.previewVideoListener(nil);
    }
    return;
  }
  if (stage != self.mainStage) return;
  if (![streams containsObject:self.remoteVideoStream]) return;
  self.remoteVideoStream = nil;
  if (self.remoteVideoListener) self.remoteVideoListener(nil);
  [self emit:@"IvsStage:remoteVideo"
        body:@{@"participantId" : participant.participantId ?: @"", @"hasVideo" : @NO}];
}

- (void)stage:(IVSStage *)stage
           participant:(IVSParticipantInfo *)participant
  didChangePublishState:(IVSParticipantPublishState)publishState {
  if (!participant.isLocal || stage != self.mainStage) return;
  NSString *state = @"NOT_PUBLISHED";
  if (publishState == IVSParticipantPublishStateAttemptingPublish) state = @"ATTEMPTING_PUBLISH";
  if (publishState == IVSParticipantPublishStatePublished) state = @"PUBLISHED";
  [self emit:@"IvsStage:publishState" body:@{@"state" : state}];
}

- (void)emit:(NSString *)event body:(id)body {
  [self.emitter sendIvsEvent:event body:body];
}

@end

#pragma mark - Módulo RN (event emitter)

@implementation IvsStageModule {
  BOOL _hasListeners;
}

RCT_EXPORT_MODULE(IvsStage);

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

- (dispatch_queue_t)methodQueue {
  return dispatch_get_main_queue();
}

- (NSArray<NSString *> *)supportedEvents {
  return @[ @"IvsStage:connectionState", @"IvsStage:remoteVideo", @"IvsStage:publishState", @"IvsStage:error" ];
}

- (void)startObserving {
  _hasListeners = YES;
}

- (void)stopObserving {
  _hasListeners = NO;
}

- (void)sendIvsEvent:(NSString *)event body:(id)body {
  if (_hasListeners) [self sendEventWithName:event body:body];
}

RCT_EXPORT_METHOD(joinAsPublisher:(NSString *)token
                  initialFacingMode:(NSString *)facingMode
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  IvsStageCoordinator *coordinator = [IvsStageCoordinator shared];
  coordinator.emitter = self;
  NSError *error;
  if ([coordinator joinAsPublisherWithToken:token facingMode:facingMode error:&error]) {
    resolve(nil);
  } else {
    reject(@"IVS_JOIN_PUBLISHER", error.localizedDescription ?: @"join failed", error);
  }
}

RCT_EXPORT_METHOD(joinAsViewer:(NSString *)token
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  IvsStageCoordinator *coordinator = [IvsStageCoordinator shared];
  coordinator.emitter = self;
  NSError *error;
  if ([coordinator joinAsViewerWithToken:token error:&error]) {
    resolve(nil);
  } else {
    reject(@"IVS_JOIN_VIEWER", error.localizedDescription ?: @"join failed", error);
  }
}

RCT_EXPORT_METHOD(startPreview:(NSString *)token
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  IvsStageCoordinator *coordinator = [IvsStageCoordinator shared];
  coordinator.emitter = self;
  NSError *error;
  if ([coordinator startPreviewWithToken:token error:&error]) {
    resolve(nil);
  } else {
    reject(@"IVS_START_PREVIEW", error.localizedDescription ?: @"preview failed", error);
  }
}

RCT_EXPORT_METHOD(stopPreview:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  [[IvsStageCoordinator shared] stopPreview];
  resolve(nil);
}

RCT_EXPORT_METHOD(setPreviewAudioMuted:(BOOL)muted
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  [[IvsStageCoordinator shared] setPreviewAudioMuted:muted];
  resolve(nil);
}

RCT_EXPORT_METHOD(leave:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  [[IvsStageCoordinator shared] leaveMain];
  resolve(nil);
}

RCT_EXPORT_METHOD(setVideoMuted:(BOOL)muted
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  [[IvsStageCoordinator shared] setVideoMuted:muted];
  resolve(nil);
}

RCT_EXPORT_METHOD(setMicMuted:(BOOL)muted
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  [[IvsStageCoordinator shared] setMicMuted:muted];
  resolve(nil);
}

RCT_EXPORT_METHOD(switchCamera:(NSString *)facingMode
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  NSError *error;
  if ([[IvsStageCoordinator shared] switchCameraFacing:facingMode error:&error]) {
    resolve(nil);
  } else {
    reject(@"IVS_SWITCH_CAMERA", error.localizedDescription ?: @"switch failed", error);
  }
}

RCT_EXPORT_METHOD(setRemoteAudioMuted:(BOOL)muted
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  [[IvsStageCoordinator shared] setRemoteAudioMuted:muted];
  resolve(nil);
}

@end

#pragma mark - Views

// Container que renderiza el preview de un IVSImageDevice y se re-attacha
// cuando el coordinator cambia de device (flip de cámara, stream nuevo, promoción).
@interface IvsPreviewContainerView : UIView
@property (nonatomic, assign) IvsViewSlot slot;
@property (nonatomic, strong, nullable) id<IVSImageDevice> currentDevice;
@end

@implementation IvsPreviewContainerView

- (void)didMoveToWindow {
  [super didMoveToWindow];
  IvsStageCoordinator *coordinator = [IvsStageCoordinator shared];
  if (self.window) {
    __weak IvsPreviewContainerView *weakSelf = self;
    void (^listener)(id<IVSImageDevice> _Nullable) = ^(id<IVSImageDevice> _Nullable device) {
      [weakSelf attachDevice:device];
    };
    switch (self.slot) {
      case IvsViewSlotLocal: coordinator.localPreviewListener = listener; break;
      case IvsViewSlotRemote: coordinator.remoteVideoListener = listener; break;
      case IvsViewSlotPreview: coordinator.previewVideoListener = listener; break;
    }
  } else {
    switch (self.slot) {
      case IvsViewSlotLocal: coordinator.localPreviewListener = nil; break;
      case IvsViewSlotRemote: coordinator.remoteVideoListener = nil; break;
      case IvsViewSlotPreview: coordinator.previewVideoListener = nil; break;
    }
    [self attachDevice:nil];
  }
}

- (void)attachDevice:(nullable id<IVSImageDevice>)device {
  if (device == self.currentDevice) return;
  self.currentDevice = device;
  for (UIView *subview in [self.subviews copy]) {
    [subview removeFromSuperview];
  }
  if (!device) return;
  NSError *error;
  IVSImagePreviewView *preview = [device previewViewWithError:&error];
  if (!preview) {
    NSLog(@"[IvsStage] preview error: %@", error.localizedDescription);
    return;
  }
  preview.frame = self.bounds;
  preview.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
  [self addSubview:preview];
}

@end

@interface IvsLocalPreviewManager : RCTViewManager
@end

@implementation IvsLocalPreviewManager
RCT_EXPORT_MODULE(IvsLocalPreview)
- (UIView *)view {
  IvsPreviewContainerView *view = [IvsPreviewContainerView new];
  view.slot = IvsViewSlotLocal;
  view.backgroundColor = [UIColor blackColor];
  return view;
}
@end

@interface IvsRemoteVideoManager : RCTViewManager
@end

@implementation IvsRemoteVideoManager
RCT_EXPORT_MODULE(IvsRemoteVideo)
- (UIView *)view {
  IvsPreviewContainerView *view = [IvsPreviewContainerView new];
  view.slot = IvsViewSlotRemote;
  view.backgroundColor = [UIColor blackColor];
  return view;
}
@end

@interface IvsPreviewVideoManager : RCTViewManager
@end

@implementation IvsPreviewVideoManager
RCT_EXPORT_MODULE(IvsPreviewVideo)
- (UIView *)view {
  IvsPreviewContainerView *view = [IvsPreviewContainerView new];
  view.slot = IvsViewSlotPreview;
  view.backgroundColor = [UIColor blackColor];
  return view;
}
@end

#pragma mark - Grabador de clips (ReplayKit + AVAssetWriter)

// Grabador de pantalla propio para el clip del comprador. Reemplaza a
// react-native-record-screen en iOS: RPScreenRecorder startCapture +
// AVAssetWriter, con el mic de ReplayKit activo (graba el audio del vivo por
// el parlante + la voz del usuario; el tap de audio-de-app NO captura el
// audio de WebRTC/IVS, por eso el mic es necesario).
//
// La pieza clave es la sesión de audio: mientras se graba se pone el preset
// STUDIO del audio manager de IVS (PlayAndRecord + defaultToSpeaker + modo
// default, SIN cancelación de eco). Configurado a través del manager, el SDK
// no lo revierte (con la sesión seteada por fuera la re-pisaba a Playback a
// los ~300 ms y el mic activo mandaba la ruta al auricular), la salida queda
// en el altavoz y sin el timbre telefónico del voice processing (preset
// VideoChat). Al frenar se restaura el preset según el rol.
@interface ScreenClipRecorder : NSObject <RCTBridgeModule>
@end

@implementation ScreenClipRecorder {
  AVAssetWriter *_writer;
  AVAssetWriterInput *_videoInput;
  AVAssetWriterInput *_audioInput;
  NSString *_outputPath;
  BOOL _active;
}

// Vuelve la sesión de audio del SDK al preset del rol vigente.
static void restoreIvsAudioPreset(void) {
  BOOL publishing = [IvsStageCoordinator shared].publishing;
  [[IVSStageAudioManager sharedInstance]
      setPreset:publishing ? IVSStageAudioManagerUseCasePresetVideoChat
                           : IVSStageAudioManagerUseCasePresetSubscribeOnly];
}

RCT_EXPORT_MODULE(ScreenClipRecorder);

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

RCT_EXPORT_METHOD(startRecording:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  RPScreenRecorder *recorder = [RPScreenRecorder sharedRecorder];
  if (!recorder.isAvailable) {
    reject(@"UNAVAILABLE", @"Screen recording not available", nil);
    return;
  }
  @synchronized(self) {
    if (_active || _writer) {
      reject(@"ALREADY_RECORDING", @"Recording already in progress", nil);
      return;
    }
    NSString *path = [NSTemporaryDirectory()
        stringByAppendingPathComponent:
            [NSString stringWithFormat:@"pulpoclip_%.0f.mp4",
                                       [NSDate date].timeIntervalSince1970 * 1000]];
    [[NSFileManager defaultManager] removeItemAtPath:path error:nil];
    NSError *writerError = nil;
    _writer = [[AVAssetWriter alloc] initWithURL:[NSURL fileURLWithPath:path]
                                        fileType:AVFileTypeMPEG4
                                           error:&writerError];
    if (writerError) {
      _writer = nil;
      reject(@"WRITER_FAILED", writerError.localizedDescription, writerError);
      return;
    }
    CGSize size = UIScreen.mainScreen.bounds.size;
    CGFloat scale = UIScreen.mainScreen.scale;
    _videoInput = [AVAssetWriterInput
        assetWriterInputWithMediaType:AVMediaTypeVideo
                       outputSettings:@{
                         AVVideoCodecKey : AVVideoCodecTypeH264,
                         AVVideoWidthKey : @(size.width * scale),
                         AVVideoHeightKey : @(size.height * scale),
                       }];
    _videoInput.expectsMediaDataInRealTime = YES;
    [_writer addInput:_videoInput];
    AudioChannelLayout stereo = {0};
    stereo.mChannelLayoutTag = kAudioChannelLayoutTag_Stereo;
    _audioInput = [AVAssetWriterInput
        assetWriterInputWithMediaType:AVMediaTypeAudio
                       outputSettings:@{
                         AVFormatIDKey : @(kAudioFormatMPEG4AAC),
                         AVSampleRateKey : @44100,
                         AVNumberOfChannelsKey : @2,
                         AVEncoderBitRateKey : @128000,
                         AVChannelLayoutKey : [NSData dataWithBytes:&stereo
                                                             length:sizeof(stereo)],
                       }];
    _audioInput.expectsMediaDataInRealTime = YES;
    [_writer addInput:_audioInput];
    _outputPath = path;
  }
  // Preset Studio ANTES de que ReplayKit active el mic: la sesión ya queda
  // PlayAndRecord + altavoz + modo default y ReplayKit la adopta tal cual.
  [[IVSStageAudioManager sharedInstance] setPreset:IVSStageAudioManagerUseCasePresetStudio];
  recorder.microphoneEnabled = YES;
  __weak __typeof(self) weakSelf = self;
  [recorder startCaptureWithHandler:^(CMSampleBufferRef sampleBuffer,
                                      RPSampleBufferType bufferType,
                                      NSError *error) {
    if (error) return;
    [weakSelf appendSampleBuffer:sampleBuffer type:bufferType];
  }
      completionHandler:^(NSError *error) {
        __typeof(self) self = weakSelf;
        if (!self) return;
        if (error) {
          @synchronized(self) {
            self->_writer = nil;
            self->_videoInput = nil;
            self->_audioInput = nil;
            self->_active = NO;
          }
          restoreIvsAudioPreset();
          BOOL declined = error.code == RPRecordingErrorUserDeclined;
          reject(declined ? @"PERMISSION_DENIED" : @"START_FAILED",
                 error.localizedDescription, error);
        } else {
          @synchronized(self) {
            self->_active = YES;
          }
          resolve(nil);
        }
      }];
}

- (void)appendSampleBuffer:(CMSampleBufferRef)sampleBuffer
                      type:(RPSampleBufferType)bufferType {
  if (!CMSampleBufferDataIsReady(sampleBuffer)) return;
  @synchronized(self) {
    if (!_active || !_writer) return;
    if (_writer.status == AVAssetWriterStatusUnknown) {
      // Arrancar la sesión del writer en el primer frame de VIDEO para que
      // el timestamp base sea visual (audio previo se descarta).
      if (bufferType != RPSampleBufferTypeVideo) return;
      [_writer startWriting];
      [_writer startSessionAtSourceTime:CMSampleBufferGetPresentationTimeStamp(sampleBuffer)];
    }
    if (_writer.status != AVAssetWriterStatusWriting) return;
    if (bufferType == RPSampleBufferTypeVideo && _videoInput.readyForMoreMediaData) {
      [_videoInput appendSampleBuffer:sampleBuffer];
    } else if (bufferType == RPSampleBufferTypeAudioMic &&
               _audioInput.readyForMoreMediaData) {
      // Pista de audio = mic (vivo por el parlante + voz). El tap AudioApp no
      // trae el audio de WebRTC/IVS, así que se ignora para no duplicar.
      [_audioInput appendSampleBuffer:sampleBuffer];
    }
  }
}

RCT_EXPORT_METHOD(stopRecording:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  @synchronized(self) {
    if (!_active) {
      reject(@"NOT_RECORDING", @"No recording in progress", nil);
      return;
    }
    _active = NO;
  }
  __weak __typeof(self) weakSelf = self;
  [[RPScreenRecorder sharedRecorder] stopCaptureWithHandler:^(NSError *error) {
    restoreIvsAudioPreset();
    __typeof(self) self = weakSelf;
    if (!self) return;
    @synchronized(self) {
      AVAssetWriter *writer = self->_writer;
      NSString *path = self->_outputPath;
      self->_writer = nil;
      self->_videoInput = nil;
      self->_audioInput = nil;
      if (!writer || writer.status != AVAssetWriterStatusWriting) {
        reject(@"NO_DATA", error.localizedDescription ?: @"No frames captured", error);
        return;
      }
      for (AVAssetWriterInput *input in writer.inputs) {
        [input markAsFinished];
      }
      [writer finishWritingWithCompletionHandler:^{
        if (writer.status == AVAssetWriterStatusCompleted) {
          resolve(path);
        } else {
          reject(@"FINALIZE_FAILED",
                 writer.error.localizedDescription ?: @"Could not finalize clip",
                 writer.error);
        }
      }];
    }
  }];
}

@end
