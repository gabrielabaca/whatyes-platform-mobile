#import <React/RCTBridgeModule.h>
#import <React/RCTUtils.h>
#import <UIKit/UIKit.h>
#import <WebRTC/WebRTC.h>
#import <libkern/OSAtomic.h>
#import <CoreVideo/CoreVideo.h>
#import "WebRTCModule.h"

// Renderer que captura exactamente un frame y lo entrega por callback.
// El callback se invoca desde el hilo de render de WebRTC.
@interface LiveCoverFrameRenderer : NSObject <RTCVideoRenderer>
@property (nonatomic, copy, nullable) void (^onFrame)(RTCVideoFrame *frame);
@end

@implementation LiveCoverFrameRenderer

- (void)setSize:(CGSize)size { (void)size; }

- (void)renderFrame:(nullable RTCVideoFrame *)frame {
  if (!frame) return;
  void (^handler)(RTCVideoFrame *) = self.onFrame;
  if (handler) {
    self.onFrame = nil;   // Rompe el retain cycle antes de llamar
    handler(frame);
  }
}

@end


@interface LiveCoverCapture : NSObject <RCTBridgeModule>
@end

@implementation LiveCoverCapture

RCT_EXPORT_MODULE(LiveCoverCapture);

// Convierte un CVPixelBuffer a UIImage.
+ (nullable UIImage *)imageFromCVPixelBuffer:(CVPixelBufferRef)pixelBuffer
                                   rotation:(RTCVideoRotation)rotation {
  UIImageOrientation orientation;
  switch (rotation) {
    case RTCVideoRotation_90:  orientation = UIImageOrientationRight; break;
    case RTCVideoRotation_180: orientation = UIImageOrientationDown;  break;
    case RTCVideoRotation_270: orientation = UIImageOrientationLeft;  break;
    default:                   orientation = UIImageOrientationUp;    break;
  }
  CIImage *ciImage = [CIImage imageWithCVPixelBuffer:pixelBuffer];
  CIContext *context = [CIContext context];
  CGImageRef cgImage = [context createCGImage:ciImage fromRect:ciImage.extent];
  if (!cgImage) return nil;
  UIImage *image = [UIImage imageWithCGImage:cgImage scale:1.0 orientation:orientation];
  CGImageRelease(cgImage);
  return image;
}

// Convierte un RTCI420Buffer en un CVPixelBuffer NV12 y luego a UIImage.
// Necesario cuando WebRTC ya procesó el frame y lo convirtió a I420 plano.
+ (nullable UIImage *)imageFromI420Buffer:(id<RTCI420Buffer>)i420
                                 rotation:(RTCVideoRotation)rotation {
  int width  = i420.width;
  int height = i420.height;

  CVPixelBufferRef pb = NULL;
  NSDictionary *opts = @{ (id)kCVPixelBufferIOSurfacePropertiesKey: @{} };
  CVReturn ret = CVPixelBufferCreate(
    kCFAllocatorDefault,
    width, height,
    kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange,   // NV12
    (__bridge CFDictionaryRef)opts,
    &pb
  );
  if (ret != kCVReturnSuccess || !pb) {
    NSLog(@"[LiveCoverCapture] CVPixelBufferCreate failed: %d", ret);
    return nil;
  }

  CVPixelBufferLockBaseAddress(pb, 0);

  // Copiar plano Y
  uint8_t *yDst   = (uint8_t *)CVPixelBufferGetBaseAddressOfPlane(pb, 0);
  size_t   yStride = CVPixelBufferGetBytesPerRowOfPlane(pb, 0);
  for (int row = 0; row < height; row++) {
    memcpy(yDst + row * yStride, i420.dataY + row * i420.strideY, width);
  }

  // Interleave U+V → UV (NV12)
  uint8_t *uvDst    = (uint8_t *)CVPixelBufferGetBaseAddressOfPlane(pb, 1);
  size_t   uvStride = CVPixelBufferGetBytesPerRowOfPlane(pb, 1);
  int uvH = (height + 1) / 2;
  int uvW = (width  + 1) / 2;
  for (int row = 0; row < uvH; row++) {
    uint8_t       *dst = uvDst + row * uvStride;
    const uint8_t *u   = i420.dataU + row * i420.strideU;
    const uint8_t *v   = i420.dataV + row * i420.strideV;
    for (int col = 0; col < uvW; col++) {
      dst[col * 2]     = u[col];
      dst[col * 2 + 1] = v[col];
    }
  }

  CVPixelBufferUnlockBaseAddress(pb, 0);

  UIImage *image = [self imageFromCVPixelBuffer:pb rotation:rotation];
  CVPixelBufferRelease(pb);
  return image;
}

// Punto de entrada principal: acepta cualquier tipo de buffer WebRTC.
+ (nullable UIImage *)imageFromFrame:(RTCVideoFrame *)frame {
  id<RTCVideoFrameBuffer> buffer = frame.buffer;

  // Caso 1: buffer directo de cámara → CVPixelBuffer (el más común en iOS)
  if ([buffer isKindOfClass:[RTCCVPixelBuffer class]]) {
    NSLog(@"[LiveCoverCapture] Buffer tipo RTCCVPixelBuffer ✓");
    return [self imageFromCVPixelBuffer:((RTCCVPixelBuffer *)buffer).pixelBuffer
                               rotation:frame.rotation];
  }

  // Caso 2: buffer ya procesado por WebRTC → I420 plano
  NSLog(@"[LiveCoverCapture] Buffer no es CVPixelBuffer (%@), intentando toI420",
        NSStringFromClass([buffer class]));
  id<RTCI420Buffer> i420 = [buffer toI420];
  if (!i420) {
    NSLog(@"[LiveCoverCapture] toI420 retornó nil");
    return nil;
  }
  return [self imageFromI420Buffer:i420 rotation:frame.rotation];
}


RCT_EXPORT_METHOD(captureVideoTrackFrame:(NSString *)trackId
                  quality:(nonnull NSNumber *)quality
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {

  NSLog(@"[LiveCoverCapture] captureVideoTrackFrame trackId=%@", trackId);

  dispatch_async(dispatch_get_main_queue(), ^{
    WebRTCModule *webrtc = [self.bridge moduleForClass:[WebRTCModule class]];
    if (!webrtc) {
      NSLog(@"[LiveCoverCapture] ERROR: WebRTCModule no disponible");
      reject(@"NO_WEBRTC", @"WebRTC module not available", nil);
      return;
    }

    NSLog(@"[LiveCoverCapture] localTracks keys: %@", webrtc.localTracks.allKeys);

    RTCMediaStreamTrack *track = webrtc.localTracks[trackId];
    if (!track) {
      NSLog(@"[LiveCoverCapture] ERROR: track no encontrado para id=%@", trackId);
      reject(@"NO_TRACK", @"Video track not found", nil);
      return;
    }
    if (![track isKindOfClass:[RTCVideoTrack class]]) {
      NSLog(@"[LiveCoverCapture] ERROR: track no es RTCVideoTrack: %@", NSStringFromClass([track class]));
      reject(@"NO_TRACK", @"Track is not a video track", nil);
      return;
    }

    RTCVideoTrack *videoTrack = (RTCVideoTrack *)track;
    LiveCoverFrameRenderer *renderer = [LiveCoverFrameRenderer new];

    __block volatile int32_t finished = 0;
    float jpegQuality = quality.floatValue;

    // Usamos weakRenderer para evitar retain cycle entre el bloque y renderer.
    __weak LiveCoverFrameRenderer *weakRenderer = renderer;

    renderer.onFrame = ^(RTCVideoFrame *frame) {
      if (!OSAtomicCompareAndSwap32Barrier(0, 1, &finished)) return;

      LiveCoverFrameRenderer *strongRenderer = weakRenderer;
      if (strongRenderer) {
        [videoTrack removeRenderer:strongRenderer];
      }

      dispatch_async(dispatch_get_main_queue(), ^{
        NSLog(@"[LiveCoverCapture] Frame recibido: %dx%d rot=%d bufClass=%@",
              frame.width, frame.height, (int)frame.rotation,
              NSStringFromClass([frame.buffer class]));

        UIImage *image = [LiveCoverCapture imageFromFrame:frame];
        if (!image) {
          NSLog(@"[LiveCoverCapture] ERROR: imageFromFrame retornó nil");
          reject(@"CAPTURE_FAILED", @"Could not convert frame to image", nil);
          return;
        }

        NSString *fileName = [NSString stringWithFormat:@"live-cover-%@.jpg",
                              [[NSUUID UUID] UUIDString]];
        NSString *path = [NSTemporaryDirectory() stringByAppendingPathComponent:fileName];
        NSData *data = UIImageJPEGRepresentation(image, jpegQuality);
        if (!data || ![data writeToFile:path atomically:YES]) {
          NSLog(@"[LiveCoverCapture] ERROR: no se pudo escribir JPEG en %@", path);
          reject(@"CAPTURE_FAILED", @"Could not write JPEG to disk", nil);
          return;
        }

        NSString *uri = [NSString stringWithFormat:@"file://%@", path];
        NSLog(@"[LiveCoverCapture] Captura OK → %@", uri);
        resolve(@{ @"uri": uri });
      });
    };

    NSLog(@"[LiveCoverCapture] addRenderer al track");
    [videoTrack addRenderer:renderer];

    // Timeout de 5 s
    __weak RTCVideoTrack *weakTrack = videoTrack;
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(5 * NSEC_PER_SEC)),
                   dispatch_get_main_queue(), ^{
      if (!OSAtomicCompareAndSwap32Barrier(0, 1, &finished)) return;
      NSLog(@"[LiveCoverCapture] TIMEOUT: no se recibió frame en 5s");
      LiveCoverFrameRenderer *strongRenderer = weakRenderer;
      if (strongRenderer) {
        [weakTrack removeRenderer:strongRenderer];
      }
      reject(@"TIMEOUT", @"No video frame received within 5s", nil);
    });
  });
}

@end
