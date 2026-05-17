import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { HomeBottomTab } from '../components/organisms/home/types';

type TabPressHandler = (tab: HomeBottomTab) => void;

interface BottomNavContextValue {
  activeTab: HomeBottomTab;
  setActiveTab: (tab: HomeBottomTab) => void;
  onTabPress: (tab: HomeBottomTab) => void;
  registerTabPressHandler: (handler: TabPressHandler | null) => void;
}

const BottomNavContext = createContext<BottomNavContextValue | null>(null);

export const BottomNavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<HomeBottomTab>('home');
  const handlerRef = useRef<TabPressHandler | null>(null);

  const registerTabPressHandler = useCallback((handler: TabPressHandler | null) => {
    handlerRef.current = handler;
  }, []);

  const onTabPress = useCallback((tab: HomeBottomTab) => {
    setActiveTab(tab);
    handlerRef.current?.(tab);
  }, []);

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      onTabPress,
      registerTabPressHandler,
    }),
    [activeTab, onTabPress, registerTabPressHandler]
  );

  return <BottomNavContext.Provider value={value}>{children}</BottomNavContext.Provider>;
};

export function useBottomNav(): BottomNavContextValue {
  const ctx = useContext(BottomNavContext);
  if (!ctx) {
    throw new Error('useBottomNav must be used within BottomNavProvider');
  }
  return ctx;
}

/** Sincroniza tab activo y handler desde pantallas (p. ej. HomeScreen). */
export function useBottomNavController(
  activeTab: HomeBottomTab,
  onTabPress: TabPressHandler
): void {
  const { setActiveTab, registerTabPressHandler } = useBottomNav();

  React.useEffect(() => {
    setActiveTab(activeTab);
  }, [activeTab, setActiveTab]);

  React.useEffect(() => {
    registerTabPressHandler(onTabPress);
    return () => registerTabPressHandler(null);
  }, [onTabPress, registerTabPressHandler]);
}
