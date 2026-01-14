import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useProStatus } from '@/contexts/ProContext';
import { trackEvent } from '@/services/analytics';
import { getOfferingsSafe, purchasePackageSafe, restorePurchasesSafe } from '../services/purchases';
import {
  getPaywallPeriodLabel,
  getPaywallPriceLabel,
  getPaywallTrialLabel,
  getPrivacyUrl,
  getTermsUrl,
} from '@/services/appConfig';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

const formatPeriodLabel = (pkg: { product?: { subscriptionPeriod?: { unit?: string; numberOfUnits?: number } } }) => {
  const period = pkg.product?.subscriptionPeriod;
  if (!period || !period.unit) return '';
  const unit = period.unit.toLowerCase();
  const count = period.numberOfUnits ?? 1;
  if (count <= 1) return unit;
  return `${count} ${unit}s`;
};

export default function PaywallModal({ visible, onClose }: PaywallModalProps) {
  const { refresh, hasConfig } = useProStatus();
  const [loading, setLoading] = useState(false);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [offering, setOffering] = useState<null | { availablePackages?: any[] }>(null);

  const termsUrl = getTermsUrl();
  const privacyUrl = getPrivacyUrl();

  const fallbackPrice = getPaywallPriceLabel() || '¥250';
  const fallbackPeriod = getPaywallPeriodLabel() || 'month';
  const fallbackTrial = getPaywallTrialLabel() || '7-day free trial';

  const loadOfferings = useCallback(async () => {
    setLoading(true);
    const next = await getOfferingsSafe();
    setOffering(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!visible) return;
    void trackEvent('paywall_shown');
    loadOfferings();
  }, [visible, loadOfferings]);

  const primaryPackage = useMemo(() => {
    if (!offering?.availablePackages || offering.availablePackages.length === 0) return null;
    return offering.availablePackages[0];
  }, [offering]);

  const priceLabel = primaryPackage?.product?.priceString || fallbackPrice;
  const periodLabel = formatPeriodLabel(primaryPackage || {}) || fallbackPeriod;

  const handlePurchase = async () => {
    if (!primaryPackage) {
      Alert.alert('Unavailable', 'No subscription package is available right now.');
      return;
    }
    setPurchaseBusy(true);
    const info = await purchasePackageSafe(primaryPackage);
    setPurchaseBusy(false);
    if (!info) {
      Alert.alert('Purchase failed', 'Unable to complete the purchase.');
      return;
    }
    await trackEvent('trial_started');
    await refresh();
    onClose();
  };

  const handleRestore = async () => {
    setPurchaseBusy(true);
    const info = await restorePurchasesSafe();
    setPurchaseBusy(false);
    if (!info) {
      Alert.alert('Restore failed', 'Unable to restore purchases.');
      return;
    }
    await refresh();
  };

  const handleLinkPress = async (url: string, label: string) => {
    if (!url) {
      Alert.alert('Link unavailable', `Set a ${label} URL before release.`);
      return;
    }
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Link unavailable', `Cannot open ${label} link.`);
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Upgrade to Pro</Text>
          <Text style={styles.subtitle}>Unlock loop bookmarks and future BPM auto-detect.</Text>

          {loading ? (
            <ActivityIndicator size="small" color="#111" style={styles.loading} />
          ) : (
            <View style={styles.pricingRow}>
              <Text style={styles.price}>{priceLabel}</Text>
              <Text style={styles.period}>/ {periodLabel}</Text>
            </View>
          )}

          <Text style={styles.trial}>{fallbackTrial}</Text>
          <Text style={styles.cancelText}>Cancel anytime.</Text>

          {!hasConfig && (
            <Text style={styles.warningText}>RevenueCat API key is missing.</Text>
          )}

          <Pressable
            style={[styles.primaryButton, purchaseBusy && styles.buttonDisabled]}
            onPress={handlePurchase}
            disabled={purchaseBusy || loading || !hasConfig}
          >
            <Text style={styles.primaryButtonText}>Start free trial</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryButton, purchaseBusy && styles.buttonDisabled]}
            onPress={handleRestore}
            disabled={purchaseBusy || loading || !hasConfig}
          >
            <Text style={styles.secondaryButtonText}>Restore purchases</Text>
          </Pressable>

          <View style={styles.linkRow}>
            <Pressable onPress={() => handleLinkPress(termsUrl, 'terms')}>
              <Text style={styles.linkText}>Terms</Text>
            </Pressable>
            <Text style={styles.linkDivider}>•</Text>
            <Pressable onPress={() => handleLinkPress(privacyUrl, 'privacy')}>
              <Text style={styles.linkText}>Privacy</Text>
            </Pressable>
          </View>

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
  },
  period: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
  },
  trial: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111',
  },
  cancelText: {
    fontSize: 12,
    color: '#666',
  },
  warningText: {
    fontSize: 12,
    color: '#b00020',
  },
  loading: {
    alignSelf: 'flex-start',
  },
  primaryButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#111',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#111',
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  linkDivider: {
    color: '#999',
  },
  linkText: {
    color: '#111',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  closeButton: {
    marginTop: 4,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#666',
    fontSize: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
