import type { CustomerInfo } from 'react-native-purchases';
import { getCustomerInfoSafe, getEntitlementId } from './purchases';

export const getProStatusFromInfo = (info: CustomerInfo | null): boolean => {
  if (!info) return false;
  const entitlementId = getEntitlementId();
  return Boolean(info.entitlements.active[entitlementId]);
};

export const fetchProStatus = async (): Promise<boolean> => {
  const info = await getCustomerInfoSafe();
  return getProStatusFromInfo(info);
};
