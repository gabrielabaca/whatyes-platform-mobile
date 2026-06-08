import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StreamIconButton } from '../../atoms/stream/StreamIconButton';
import { StreamProductStack } from './StreamProductStack';
import { FONT_FAMILY } from '../../../theme/typography';
import { STREAM_COLORS, STREAM_RADIUS } from './streamTokens';

export interface StreamChatComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onLike?: () => void;
  showLikeButton?: boolean;
  productImageUrls?: string[];
  productExtraCount?: number;
  showProductPlaceholder?: boolean;
  onProductStackPress?: () => void;
}

export const StreamChatComposer: React.FC<StreamChatComposerProps> = ({
  value,
  onChangeText,
  onSubmit,
  onLike,
  showLikeButton = true,
  productImageUrls,
  productExtraCount,
  showProductPlaceholder,
  onProductStackPress,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={t('stream.chatPlaceholder')}
          placeholderTextColor={STREAM_COLORS.placeholder}
          style={styles.input}
          returnKeyType="send"
          onSubmitEditing={onSubmit}
          blurOnSubmit={false}
        />
        {showLikeButton ? (
          <StreamIconButton onPress={onLike} accessibilityLabel={t('stream.like')}>
            <Heart size={22} color="#FB2C36" fill="#FB2C36" />
          </StreamIconButton>
        ) : null}
      </View>
      <StreamProductStack
        imageUrls={productImageUrls}
        extraCount={productExtraCount}
        showPlaceholder={showProductPlaceholder}
        onPress={onProductStackPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: STREAM_COLORS.chatInputBg,
    borderWidth: 0.7,
    borderColor: STREAM_COLORS.chatInputBorder,
    borderRadius: STREAM_RADIUS.pill,
    paddingLeft: 16,
    paddingRight: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: STREAM_COLORS.white,
    padding: 0,
    includeFontPadding: false,
  },
});
