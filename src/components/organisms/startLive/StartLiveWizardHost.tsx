/**
 * Renderiza los pasos del asistente de iniciar live.
 * Con el setup completo, el paso 'launch' dispara el PreLive directamente
 * (sin drawers intermedios).
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import type { StreamConfig } from '../../pages/StreamConfigScreen';
import { useStartLiveWizard } from '../../../hooks/useStartLiveWizard';
import { StartLiveIntroDrawer } from './StartLiveIntroDrawer';
import { StartLiveSetupDrawer } from './StartLiveSetupDrawer';

export interface StartLiveWizardHostProps {
  onStartLive: (config: StreamConfig) => void;
}

export const StartLiveWizardHost: React.FC<StartLiveWizardHostProps> = ({ onStartLive }) => {
  const wizard = useStartLiveWizard();
  const { step, busy, close, setupNeeds, knownTaxId } = wizard;

  useEffect(() => {
    if (step !== 'launch') return;
    const config = wizard.finishAndStartLive();
    if (config) {
      onStartLive(config);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (step === 'closed' || step === 'launch') {
    return null;
  }

  return (
    <View style={styles.host} pointerEvents="box-none">
      <StartLiveIntroDrawer
        visible={step === 'intro'}
        busy={busy}
        onClose={close}
        onContinue={(isFirst) => void wizard.completeIntro(isFirst)}
      />
      <StartLiveSetupDrawer
        visible={step === 'setup'}
        busy={busy}
        needsCustomer={setupNeeds.customer}
        needsPayout={setupNeeds.payout}
        initialTaxId={knownTaxId}
        onClose={close}
        onSubmit={wizard.completeSetup}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 300,
    elevation: 300,
  },
});
