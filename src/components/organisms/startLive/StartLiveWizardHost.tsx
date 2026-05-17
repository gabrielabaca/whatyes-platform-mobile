import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { StreamConfig } from '../../pages/StreamConfigScreen';
import { useStartLiveWizard } from '../../../hooks/useStartLiveWizard';
import { StartLiveWelcomeDrawer } from './StartLiveWelcomeDrawer';
import { StartLiveTermsDrawer } from './StartLiveTermsDrawer';
import { StartLiveCategoriesDrawer } from './StartLiveCategoriesDrawer';
import { StartLiveFirstAuctionDrawer } from './StartLiveFirstAuctionDrawer';
import { StartLiveSellerUpgradeDrawer } from './StartLiveSellerUpgradeDrawer';
import { StartLiveBankPromptDrawer } from './StartLiveBankPromptDrawer';
import { StartLiveBankFormDrawer } from './StartLiveBankFormDrawer';
import { StartLiveReadyDrawer } from './StartLiveReadyDrawer';

export interface StartLiveWizardHostProps {
  onStartLive: (config: StreamConfig) => void;
}

export const StartLiveWizardHost: React.FC<StartLiveWizardHostProps> = ({ onStartLive }) => {
  const wizard = useStartLiveWizard();
  const { step, busy, close } = wizard;

  if (step === 'closed') {
    return null;
  }

  const handleStart = () => {
    const config = wizard.finishAndStartLive();
    if (config) {
      onStartLive(config);
    }
  };

  return (
    <View style={styles.host} pointerEvents="box-none">
      <StartLiveWelcomeDrawer
        visible={step === 'welcome1'}
        busy={busy}
        onClose={close}
        onContinue={() => void wizard.completeWelcome1()}
      />
      <StartLiveTermsDrawer
        visible={step === 'welcome2'}
        busy={busy}
        onClose={close}
        onContinue={() => void wizard.completeWelcome2()}
      />
      <StartLiveCategoriesDrawer
        visible={step === 'categories'}
        busy={busy}
        onClose={close}
        onContinue={(uuids) => void wizard.completeCategories(uuids)}
      />
      <StartLiveFirstAuctionDrawer
        visible={step === 'firstAuction'}
        busy={busy}
        onClose={close}
        onContinue={(isFirst) => void wizard.completeFirstAuction(isFirst)}
      />
      <StartLiveSellerUpgradeDrawer
        visible={step === 'sellerUpgrade'}
        busy={busy}
        onClose={close}
        onSubmit={wizard.completeSellerUpgrade}
      />
      <StartLiveBankPromptDrawer
        visible={step === 'bankPrompt'}
        onClose={close}
        onContinue={wizard.completeBankPrompt}
      />
      <StartLiveBankFormDrawer
        visible={step === 'bankForm'}
        busy={busy}
        onClose={close}
        onSaved={() => void wizard.completeBankForm()}
      />
      <StartLiveReadyDrawer visible={step === 'ready'} onClose={close} onStart={handleStart} />
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
