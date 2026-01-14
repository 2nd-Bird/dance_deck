import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { trackEvent } from '@/services/analytics';
import { getCustomerInfoSafe } from '../services/purchases';
import { getProStatusFromInfo } from '../services/proStatus';
import { initializeRevenueCat } from '../services/revenuecat';

interface ProContextValue {
  isPro: boolean;
  isReady: boolean;
  hasConfig: boolean;
  refresh: () => Promise<void>;
}

const ProContext = createContext<ProContextValue | null>(null);

export const ProProvider = ({ children }: { children: React.ReactNode }) => {
  const [isPro, setIsPro] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);
  const previousIsProRef = useRef<boolean | null>(null);

  const refresh = useCallback(async () => {
    const info = await getCustomerInfoSafe();
    const nextIsPro = getProStatusFromInfo(info);
    const previous = previousIsProRef.current;
    if (previous !== null && previous !== nextIsPro) {
      if (nextIsPro) {
        void trackEvent('trial_converted');
      } else {
        void trackEvent('trial_canceled');
      }
    }
    previousIsProRef.current = nextIsPro;
    setIsPro(nextIsPro);
    setIsReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const status = await initializeRevenueCat();
      if (cancelled) return;
      setHasConfig(status.hasConfig);
      if (!status.hasConfig) {
        setIsReady(true);
        return;
      }
      await refresh();
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const value = useMemo(
    () => ({
      isPro,
      isReady,
      hasConfig,
      refresh,
    }),
    [isPro, isReady, hasConfig, refresh]
  );

  return <ProContext.Provider value={value}>{children}</ProContext.Provider>;
};

export const useProStatus = () => {
  const ctx = useContext(ProContext);
  if (!ctx) {
    throw new Error('useProStatus must be used within ProProvider');
  }
  return ctx;
};
