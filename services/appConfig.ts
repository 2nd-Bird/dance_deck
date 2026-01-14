import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

const getString = (value: unknown) => (typeof value === 'string' ? value : '');

export const getTermsUrl = () => getString(extra.termsUrl);
export const getPrivacyUrl = () => getString(extra.privacyUrl);
export const getPaywallPriceLabel = () => getString(extra.paywallPriceLabel);
export const getPaywallPeriodLabel = () => getString(extra.paywallPeriodLabel);
export const getPaywallTrialLabel = () => getString(extra.paywallTrialLabel);
