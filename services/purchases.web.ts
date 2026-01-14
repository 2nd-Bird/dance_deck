export interface PurchasesConfigStatus {
  configured: boolean;
  hasConfig: boolean;
}

export const configurePurchases = async (): Promise<PurchasesConfigStatus> => ({
  configured: false,
  hasConfig: false,
});

export const getCustomerInfoSafe = async () => null;
export const getOfferingsSafe = async () => null;
export const purchasePackageSafe = async () => null;
export const restorePurchasesSafe = async () => null;
export const getProStatusFromInfo = () => false;
export const getEntitlementId = () => 'pro';
