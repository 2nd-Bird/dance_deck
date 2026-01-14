import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { useProStatus } from '@/contexts/ProContext';
import { trackEvent } from '@/services/analytics';
import { getDefaultOfferingSafe } from '@/services/purchases';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PaywallModal({ visible, onClose }: PaywallModalProps) {
  const { refresh, hasConfig } = useProStatus();
  const presentingRef = useRef(false);

  useEffect(() => {
    if (!visible || presentingRef.current) return;
    if (!hasConfig) {
      Alert.alert('RevenueCat not configured', 'Set API keys in .env before testing purchases.');
      onClose();
      return;
    }

    presentingRef.current = true;

    const presentPaywall = async () => {
      await trackEvent('paywall_shown');
      try {
        const offering = await getDefaultOfferingSafe();
        const paywallResult: PAYWALL_RESULT = offering
          ? await RevenueCatUI.presentPaywall({ offering })
          : await RevenueCatUI.presentPaywall();
        if (paywallResult === PAYWALL_RESULT.PURCHASED) {
          await trackEvent('trial_started');
        }
        if (paywallResult === PAYWALL_RESULT.PURCHASED || paywallResult === PAYWALL_RESULT.RESTORED) {
          await refresh();
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('Failed to present paywall', error);
        }
      } finally {
        presentingRef.current = false;
        onClose();
      }
    };

    presentPaywall();
  }, [visible, hasConfig, onClose, refresh]);

  return null;
}
