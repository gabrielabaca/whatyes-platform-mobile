/**
 * Selector de dirección de envío en Cuenta — Figma 1210:3409.
 *
 * El formulario de alta va en `overlay`: en iOS un Modal hermano no se presenta
 * mientras este ya está abierto (mismo patrón que Preferencias → borrar cuenta).
 */
import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  GlassFullScreenModal,
  type GlassFullScreenModalHandle,
} from '../profile/GlassFullScreenModal';
import { GlassModalHeader } from '../profile/GlassModalHeader';
import { ShippingAddressPicker, ShippingAddressAddButton } from './ShippingAddressPicker';
import { ShippingAddressModal } from './ShippingAddressModal';

export interface ShippingAddressSelectorModalProps {
  visible: boolean;
  defaultFullName?: string;
  onClose: () => void;
  onChanged?: () => void;
}

export const ShippingAddressSelectorModal: React.FC<
  ShippingAddressSelectorModalProps
> = ({ visible, defaultFullName, onClose, onChanged }) => {
  const { t } = useTranslation();
  const modalRef = useRef<GlassFullScreenModalHandle>(null);
  const [createVisible, setCreateVisible] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const handleClose = () => {
    modalRef.current?.dismiss();
  };

  const handleCreated = () => {
    setCreateVisible(false);
    setReloadToken((n) => n + 1);
    onChanged?.();
  };

  return (
    <GlassFullScreenModal
      ref={modalRef}
      visible={visible}
      onClose={() => {
        setCreateVisible(false);
        onClose();
      }}
      backdropAccessibilityLabel={t('account.shippingAddress.close')}
      dismissOnBackdropPress={false}
      overlay={
        <ShippingAddressModal
          visible={createVisible}
          mode="create"
          defaultFullName={defaultFullName}
          onClose={() => setCreateVisible(false)}
          onSaved={handleCreated}
        />
      }
      header={
        <GlassModalHeader
          title={t('account.shippingAddress.title')}
          onClose={handleClose}
        />
      }
      footer={
        <View style={styles.footer}>
          <ShippingAddressAddButton onPress={() => setCreateVisible(true)} />
        </View>
      }
      contentContainerStyle={styles.scrollContent}
    >
      <ShippingAddressPicker
        visible={visible}
        reloadToken={reloadToken}
        onChanged={onChanged}
      />
    </GlassFullScreenModal>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  footer: {
    width: '100%',
    paddingHorizontal: 24,
  },
});
