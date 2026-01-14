import Constants from 'expo-constants';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, LOG_LEVEL, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

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
  return Platform.select({
    ios: iosKey,
    android: androidKey,
    default: '',
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
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
  }
  const apiKey = getApiKey();
  if (!apiKey) {
    return { configured: false, hasConfig: false };
  }
  if (!hasConfigured) {
    if (Platform.OS === 'ios') {
      Purchases.configure({ apiKey });
    } else if (Platform.OS === 'android') {
      Purchases.configure({ apiKey });
    } else {
      Purchases.configure({ apiKey });
    }
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

export const getDefaultOfferingSafe = async (): Promise<PurchasesOffering | null> => {
  const status = await configurePurchases();
  if (!status.configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.all?.default ?? offerings.current ?? null;
  } catch (error) {
    if (__DEV__) {
      console.warn('Failed to load default offering', error);
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
