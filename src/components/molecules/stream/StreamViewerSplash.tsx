import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import HeaderLogo from '../../../../assets/images/header_logo.svg';
import { Text } from '../../atoms/Text';

export interface StreamViewerSplashProps {
  coverUrl?: string | null;
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
  /** Spinner bajo el logo (p. ej. al conectar). */
  showSpinner?: boolean;
}

export const StreamViewerSplash: React.FC<StreamViewerSplashProps> = ({
  coverUrl,
  title,
  subtitle,
  actionLabel,
  onAction,
  showSpinner = false,
}) => (
  <View style={styles.root}>
    {coverUrl ? (
      <>
        <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFill, styles.coverDim]} />
      </>
    ) : null}
    <View style={styles.content}>
      <View style={styles.logoWrap}>
        <HeaderLogo width={72} height={64} accessibilityLabel="PulpoLive" />
        {showSpinner ? (
          <ActivityIndicator size="large" color="#685CF0" style={styles.spinner} />
        ) : null}
      </View>
      <Text variant="h3" className="text-white text-center mb-2">
        {title}
      </Text>
      <Text variant="body" className="text-white/80 text-center px-4">
        {subtitle}
      </Text>
    </View>
    <TouchableOpacity
      onPress={onAction}
      style={styles.actionBtn}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={actionLabel}
    >
      <Text variant="body" className="text-white font-semibold">
        {actionLabel}
      </Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 48,
  },
  coverDim: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  spinner: {
    marginTop: 20,
  },
  actionBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    minWidth: 160,
    alignItems: 'center',
  },
});
