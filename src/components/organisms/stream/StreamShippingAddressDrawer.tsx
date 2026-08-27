/**
 * Selector de dirección de envío en el vivo — Figma 698:7347.
 *
 * El sheet es inline (no Modal nativo), así el formulario de alta puede ser un
 * Modal hermano sin el bug de iOS. El contenido es el mismo `ShippingAddressPicker`.
 */
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet, streamBottomPanelStyle } from './StreamBottomSheet';
import {
  ShippingAddressPicker,
  ShippingAddressAddButton,
} from '../account/ShippingAddressPicker';
import { ShippingAddressModal } from '../account/ShippingAddressModal';

export interface StreamShippingAddressDrawerProps {
  visible: boolean;
  defaultFullName?: string;
  onClose: () => void;
  /** Tras elegir, crear o borrar: el vivo recotiza el envío. */
  onChanged?: () => void;
}

export const StreamShippingAddressDrawer: React.FC<
  StreamShippingAddressDrawerProps
> = ({ visible, defaultFullName, onClose, onChanged }) => {
  const { t } = useTranslation();
  const [createVisible, setCreateVisible] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const handleCreated = () => {
    setCreateVisible(false);
    setReloadToken((n) => n + 1);
    onChanged?.();
  };

  return (
    <>
      <StreamBottomSheet
        visible={visible}
        title={t('account.shippingAddress.title')}
        onClose={() => {
          setCreateVisible(false);
          onClose();
        }}
        panelStyle={streamBottomPanelStyle}
        contentContainerStyle={styles.content}
        footer={
          <ShippingAddressAddButton onPress={() => setCreateVisible(true)} />
        }
      >
        <ShippingAddressPicker
          visible={visible}
          reloadToken={reloadToken}
          onChanged={onChanged}
        />
      </StreamBottomSheet>
      <ShippingAddressModal
        visible={createVisible}
        mode="create"
        defaultFullName={defaultFullName}
        onClose={() => setCreateVisible(false)}
        onSaved={handleCreated}
      />
    </>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 16,
    alignItems: 'stretch',
  },
});
