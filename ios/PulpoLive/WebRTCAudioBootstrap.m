#import "WebRTCAudioBootstrap.h"

#import <AVFoundation/AVFoundation.h>
#import <WebRTC/RTCAudioSession.h>
#import <WebRTC/RTCAudioSessionConfiguration.h>

@implementation PulpoWebRTCAudioBootstrap

+ (void)configureForLivePlayback {
  RTCAudioSessionConfiguration *config = [RTCAudioSessionConfiguration webRTCConfiguration];
  config.category = AVAudioSessionCategoryPlayAndRecord;
  config.mode = AVAudioSessionModeVideoChat;
  config.categoryOptions =
      AVAudioSessionCategoryOptionDefaultToSpeaker | AVAudioSessionCategoryOptionAllowBluetooth |
      AVAudioSessionCategoryOptionAllowBluetoothA2DP;

  // Obligatorio: si solo se toca AVAudioSession, WebRTC vuelve a aplicar su plantilla interna.
  [RTCAudioSessionConfiguration setWebRTCConfiguration:config];

  RTCAudioSession *rtcSession = [RTCAudioSession sharedInstance];
  [rtcSession lockForConfiguration];
  NSError *catError = nil;
  [rtcSession setCategory:config.category withOptions:config.categoryOptions error:&catError];
  if (catError != nil) {
    NSLog(@"[PulpoWebRTCAudio] setCategory error: %@", catError);
  }
  NSError *modeError = nil;
  [rtcSession setMode:config.mode error:&modeError];
  if (modeError != nil) {
    NSLog(@"[PulpoWebRTCAudio] setMode error: %@", modeError);
  }
  [rtcSession unlockForConfiguration];

  // Refuerzo sobre la sesión del sistema cuando ya está activa.
  AVAudioSession *av = [AVAudioSession sharedInstance];
  NSError *avError = nil;
  [av setCategory:config.category withOptions:config.categoryOptions error:&avError];
  [av setMode:config.mode error:&avError];
  [av overrideOutputAudioPort:AVAudioSessionPortOverrideSpeaker error:&avError];
}

@end
