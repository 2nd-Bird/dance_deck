const baseConfig = require('./app.json');

const expoConfig = baseConfig.expo ?? {};
const existingExtra = expoConfig.extra ?? {};

module.exports = () => ({
  ...expoConfig,
  extra: {
    ...existingExtra,
    revenueCatApiKeyIos: process.env.EXPO_PUBLIC_RC_IOS_API_KEY ?? '',
    revenueCatApiKeyAndroid: process.env.EXPO_PUBLIC_RC_ANDROID_API_KEY ?? '',
    revenueCatEntitlementId: process.env.REVENUECAT_ENTITLEMENT_ID ?? 'pro',
    termsUrl: process.env.TERMS_URL ?? '',
    privacyUrl: process.env.PRIVACY_URL ?? '',
    paywallPriceLabel: process.env.PAYWALL_PRICE_LABEL ?? '',
    paywallPeriodLabel: process.env.PAYWALL_PERIOD_LABEL ?? '',
    paywallTrialLabel: process.env.PAYWALL_TRIAL_LABEL ?? '',
  },
});
