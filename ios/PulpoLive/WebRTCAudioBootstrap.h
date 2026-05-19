#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface PulpoWebRTCAudioBootstrap : NSObject

/// Ajusta la configuración por defecto de WebRTC (Jitsi) para live: salida tipo medios / altavoz.
+ (void)configureForLivePlayback;

@end

NS_ASSUME_NONNULL_END
