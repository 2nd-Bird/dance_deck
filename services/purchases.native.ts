import Constants from 'expo-constants';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

export interface PurchasesConfigStatus {
  configured: boolean;
  hasConfig: boolean;
}

const getExtraConfig = () => {
  const extra = Constants.expoConfig?.extra;
  return typeof extra === 'object' && extra ? extra : {};
};

const getApiKey = () => {
  const extra = getExtraConfig();
  const iosKey = typeof extra.revenueCatApiKeyIos === 'string' ? extra.revenueCatApiKeyIos : '';
  const androidKey = typeof extra.revenueCatApiKeyAndroid === 'string' ? extra.revenueCatApiKeyAndroid : '';
  const fallbackKey = typeof extra.revenueCatApiKey === 'string' ? extra.revenueCatApiKey : '';
  return Platform.select({
    ios: iosKey || fallbackKey,
    android: androidKey || fallbackKey,
    default: fallbackKey,
  }) ?? '';
};

export const getEntitlementId = () => {
  const extra = getExtraConfig();
  return typeof extra.revenueCatEntitlementId === 'string' && extra.revenueCatEntitlementId
    ? extra.revenueCatEntitlementId
    : 'pro';
};

let hasConfigured = false;

export const configurePurchases = async (): Promise<PurchasesConfigStatus> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { configured: false, hasConfig: false };
  }
  if (!hasConfigured) {
    Purchases.configure({ apiKey });
    hasConfigured = true;
  }
  return { configured: true, hasConfig: true };
};

export const getCustomerInfoSafe = async (): Promise<CustomerInfo | null> => {
  const status = await configurePurchases();
  if (!status.configured) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    if (__DEV__) {
      console.warn('Failed to load customer info', error);
    }
    return null;
  }
};

export const getOfferingsSafe = async (): Promise<PurchasesOffering | null> => {
  const status = await configurePurchases();
  if (!status.configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (error) {
    if (__DEV__) {
      console.warn('Failed to load offerings', error);
    }
    return null;
  }
};

export const purchasePackageSafe = async (pkg: PurchasesPackage): Promise<CustomerInfo | null> => {
  const status = await configurePurchases();
  if (!status.configured) return null;
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (error) {
    if (__DEV__) {
      console.warn('Purchase failed', error);
    }
    return null;
  }
};

export const restorePurchasesSafe = async (): Promise<CustomerInfo | null> => {
  const status = await configurePurchases();
  if (!status.configured) return null;
  try {
    return await Purchases.restorePurchases();
  } catch (error) {
    if (__DEV__) {
      console.warn('Restore failed', error);
    }
    return null;
  }
};

export const getProStatusFromInfo = (info: CustomerInfo | null): boolean => {
  if (!info) return false;
  const entitlementId = getEntitlementId();
  return Boolean(info.entitlements.active[entitlementId]);
};
