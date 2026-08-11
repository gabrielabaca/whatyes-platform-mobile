/**
 * Host raíz del diálogo de alerta. Debe vivir bajo `ThemeProvider`.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { AppAlertDialog } from './AppAlertDialog';
import { bindAppAlertListener, dismissAppAlert } from './appAlert';
import type { AppAlertButton, AppAlertRequest } from './types';

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [request, setRequest] = useState<AppAlertRequest | null>(null);

  useEffect(() => bindAppAlertListener(setRequest), []);

  const handleDismiss = useCallback(() => {
    dismissAppAlert();
  }, []);

  const handleButtonPress = useCallback((button: AppAlertButton) => {
    dismissAppAlert();
    // Diferir el callback al próximo tick para que el Modal cierre antes de
    // abrir otro alert / navegar (mismo patrón mental que Alert.alert de RN).
    setTimeout(() => {
      button.onPress?.();
    }, 0);
  }, []);

  return (
    <>
      {children}
      <AppAlertDialog
        request={request}
        onDismiss={handleDismiss}
        onButtonPress={handleButtonPress}
      />
    </>
  );
};
