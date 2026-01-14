import { configurePurchases } from './purchases';

// Dev Client check:
// 1) Set keys in .env, then run `pnpm install`.
// 2) Build a dev client: `eas build --profile development --platform ios|android`.
// 3) Launch with `expo start --dev-client` and open the app in the dev client.
export const initializeRevenueCat = async () => configurePurchases();
