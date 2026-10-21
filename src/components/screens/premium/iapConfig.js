/**
 * In-app purchase configuration — single source of truth for the
 * Google Play lifetime-premium product and the backend verification
 * endpoint the app trusts for entitlement.
 */

// Same backend the account screen talks to (see screens/profile.js).
export const API_BASE_URL = 'https://www.techt.site/api/content';

// Google Play Console product ID (non-consumable, lifetime).
export const PREMIUM_PRODUCT_ID = 'engineering_premium';

// Must match the applicationId the app is signed & published with.
export const ANDROID_PACKAGE_NAME = 'com.threeapp';

// Backend endpoint that verifies a Google Play purchase server-side
// (Play Developer API with a service account — credentials NEVER ship
// in the app) and sets user.premium.active = true on success.
// Expected contract:
//   POST {API_BASE_URL}/billing/google/verify-purchase
//   Authorization: Bearer <backend access token>
//   Body: { productId, purchaseToken, packageName, transactionReceipt? }
//   200: { success: true, data: { premium: { active: true } } }
export const VERIFY_GOOGLE_PURCHASE_PATH = '/billing/google/verify-purchase';

// Same key screens/profile.js stores the backend access token under.
export const ACCESS_TOKEN_STORAGE_KEY = '@threeapp/accessToken';
