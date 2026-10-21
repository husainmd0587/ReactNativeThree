import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ACCESS_TOKEN_STORAGE_KEY,
  ANDROID_PACKAGE_NAME,
  API_BASE_URL,
  PREMIUM_PRODUCT_ID,
  VERIFY_GOOGLE_PURCHASE_PATH,
} from './iapConfig';

/**
 * Asks our backend to verify a Google Play purchase and grant/refresh
 * the lifetime entitlement.
 *
 * Returns (never throws):
 *   { ok: true,  premiumActive: boolean, message?: string }
 *   { ok: false, message: string, missingEndpoint?: boolean, networkError?: boolean }
 *
 * The app must only treat the user as premium when the backend says so
 * (or when /auth/me later reports premium.active). A local flag or the
 * Play callback alone is not trusted.
 */
const verifyGooglePurchase = async (purchase) => {
  const purchaseToken = purchase?.purchaseToken;
  if (!purchaseToken) {
    return {ok: false, message: 'Purchase receipt is missing a token.'};
  }

  const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  if (!accessToken) {
    return {ok: false, message: 'Not signed in — sign in before purchasing.'};
  }

  try {
    const res = await fetch(`${API_BASE_URL}${VERIFY_GOOGLE_PURCHASE_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        productId: purchase.productId || PREMIUM_PRODUCT_ID,
        purchaseToken,
        packageName: ANDROID_PACKAGE_NAME,
        // Secondary data for servers that prefer validating the receipt blob.
        transactionReceipt: purchase.transactionReceipt || undefined,
      }),
    });

    let json = null;
    try {
      json = await res.json();
    } catch (e) {
      json = null;
    }

    if (res.status === 404 || res.status === 501) {
      return {
        ok: false,
        missingEndpoint: true,
        message:
          'Server purchase verification is not available yet. Your purchase was NOT lost — it stays pending with Google until verified.',
      };
    }

    if (!res.ok || !json?.success) {
      return {
        ok: false,
        message: json?.message || `Verification failed (HTTP ${res.status}).`,
      };
    }

    return {
      ok: true,
      premiumActive: !!json?.data?.premium?.active,
      message: json?.message,
    };
  } catch (err) {
    return {
      ok: false,
      networkError: true,
      message: err?.message || 'Network error while verifying purchase.',
    };
  }
};

export default verifyGooglePurchase;
