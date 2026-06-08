import React, { useMemo } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import HeaderLogo from '../../../../assets/images/header_logo.svg';
import { Text } from '../../atoms/Text';

export interface StreamPausedMediaProps {
  introVideoUrl?: string | null;
  coverUrl?: string | null;
  /** Seller: solo fondo (cover/intro). Viewer: fondo + mensaje de pausa. */
  variant?: 'seller' | 'viewer';
}

const buildIntroVideoHtml = (url: string) => `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <style>
    * { margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
    video { width: 100%; height: 100%; object-fit: cover; }
  </style>
</head>
<body>
  <video src="${url.replace(/"/g, '&quot;')}" autoplay loop muted playsinline></video>
</body>
</html>`;

/** Pantalla de espera cuando el vendedor pausa el vivo (debajo del overlay de controles). */
export const StreamPausedMedia: React.FC<StreamPausedMediaProps> = ({
  introVideoUrl,
  coverUrl,
  variant = 'viewer',
}) => {
  const { t } = useTranslation();
  const introUrl = introVideoUrl?.trim() || null;
  const cover = coverUrl?.trim() || null;
  const showPauseMessage = variant === 'viewer';
  const introHtml = useMemo(
    () => (introUrl ? buildIntroVideoHtml(introUrl) : null),
    [introUrl],
  );

  return (
    <View style={styles.root} pointerEvents="none">
      {introUrl && introHtml ? (
        <WebView
          source={{ html: introHtml }}
          style={styles.background}
          scrollEnabled={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          pointerEvents="none"
        />
      ) : cover ? (
        <Image source={{ uri: cover }} style={styles.background} resizeMode="cover" />
      ) : (
        <View style={styles.background} />
      )}

      {showPauseMessage ? (
        <View style={styles.messageLayer}>
          <View style={styles.dimScrim} />
          <View style={styles.messageContent}>
            <HeaderLogo width={96} height={86} accessibilityLabel="PulpoLive" />
            <Text variant="h3" className="text-white text-center mt-6 px-8">
              {t('stream.pausedFallbackMessage')}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    elevation: 1,
    backgroundColor: '#000',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  messageLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dimScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  messageContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    maxWidth: '100%',
  },
});
