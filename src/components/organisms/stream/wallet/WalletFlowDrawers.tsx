import React from 'react';
import type { useStreamWalletFlow } from '../../../../hooks/useStreamWalletFlow';
import { ShippingAddressModal } from '../../account/ShippingAddressModal';
import { BuyerKycModal } from '../../account/BuyerKycModal';
import { StreamWalletIntroDrawer } from './StreamWalletIntroDrawer';
import { StreamWalletHubDrawer } from './StreamWalletHubDrawer';
import { StreamPaymentMethodsDrawer } from './StreamPaymentMethodsDrawer';
import { StreamAddCardDrawer } from './StreamAddCardDrawer';
import { StreamWalletSuccessDrawer } from './StreamWalletSuccessDrawer';
import { StreamMpWalletConnectModal } from './StreamMpWalletConnectModal';

/**
 * Stack completo de drawers de pagos y envíos (Figma 536-20451 y siguientes).
 *
 * Vive acá para que el vivo y el menú de cuenta ("Pagos y Envíos") monten
 * exactamente los mismos pasos; el estado lo maneja `useStreamWalletFlow`.
 */
export interface WalletFlowDrawersProps {
  wallet: ReturnType<typeof useStreamWalletFlow>;
  /** Nombre precargado en el formulario de domicilio. */
  defaultFullName?: string;
  /** Efecto extra al guardar el domicilio (el vivo recotiza el envío). */
  onShippingSaved?: () => void;
}

export const WalletFlowDrawers: React.FC<WalletFlowDrawersProps> = ({
  wallet,
  defaultFullName,
  onShippingSaved,
}) => (
  <>
    <StreamWalletIntroDrawer
      visible={wallet.step === 'intro'}
      onClose={wallet.closeAll}
      onContinue={() => {
        void wallet.goToHub();
      }}
      onRemindLater={wallet.closeAll}
    />
    <StreamWalletHubDrawer
      visible={wallet.step === 'hub'}
      onClose={wallet.closeAll}
      loading={wallet.hubLoading}
      shippingActionLabel={wallet.shippingActionLabel}
      paymentActionLabel={wallet.paymentActionLabel}
      onShippingPress={wallet.openShipping}
      onPaymentPress={() => {
        void wallet.openPayment();
      }}
    />
    <ShippingAddressModal
      visible={wallet.step === 'shipping'}
      mode="edit"
      defaultFullName={defaultFullName}
      onClose={() => {
        void wallet.returnToHub();
      }}
      onSaved={() => {
        void wallet.onShippingSaved();
        onShippingSaved?.();
      }}
    />
    <BuyerKycModal
      visible={wallet.step === 'kyc'}
      onClose={wallet.closeAll}
      onVerified={() => {
        void wallet.onKycVerified();
      }}
    />
    <StreamPaymentMethodsDrawer
      visible={wallet.step === 'methods'}
      onClose={wallet.closeAll}
      loading={wallet.hubLoading}
      cards={wallet.cards}
      preferredOrigin={wallet.preferredOrigin}
      showMpWallet={wallet.walletLinkEnabled}
      onSelectMpWallet={() => {
        void wallet.selectMpWallet();
      }}
      onSelectCard={(card) => {
        void wallet.selectCard(card);
      }}
      onDeleteCard={wallet.deleteCard}
      onAddCard={wallet.openCardForm}
    />
    <StreamMpWalletConnectModal
      visible={wallet.mpConnectVisible}
      session={wallet.mpConnectSession}
      loading={wallet.mpConnectLoading}
      onReturn={wallet.onMpWalletConnectReturn}
      onTestAckConfirm={wallet.confirmMpWalletTestAck}
      onCancel={wallet.cancelMpWalletConnect}
    />
    <StreamAddCardDrawer
      visible={wallet.step === 'cardForm'}
      onClose={wallet.closeAll}
      payerEmail={wallet.userEmail}
      setAsDefault={wallet.cards.length === 0}
      onSaved={(card) => {
        void wallet.onCardSaved(card);
      }}
    />
    <StreamWalletSuccessDrawer
      visible={wallet.step === 'success'}
      paymentMethod={wallet.successPaymentMethod}
      onClose={wallet.closeAll}
    />
  </>
);
