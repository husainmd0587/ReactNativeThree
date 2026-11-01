import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ACCESS_TOKEN_STORAGE_KEY,
  ANDROID_PACKAGE_NAME,
  API_BASE_URL,
  PREMIUM_PRODUCT_ID,
  VERIFY_GOOGLE_PURCHASE_PATH,
} from './iapConfig';

// Hard cap on how long we wait for the backend before giving up, so the
// UI can never spin forever on a stalled connection.
const VERIFY_TIMEOUT_MS = 20000;

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

  // Never let the UI hang: abort the request after a bounded wait so the
  // caller (card / diagnostics) can always reset its spinner and tell the
  // user. The purchase stays unacknowledged, so nothing is lost.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}${VERIFY_GOOGLE_PURCHASE_PATH}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        productId: PREMIUM_PRODUCT_ID,
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
    const aborted = err?.name === 'AbortError';
    return {
      ok: false,
      networkError: true,
      message: aborted
        ? `${VERIFY_TIMEOUT_MS / 1000}s wait for the server timed out. Your purchase was NOT lost — try "Restore purchase" again.`
        : err?.message || 'Network error while verifying purchase.',
    };
  } finally {
    clearTimeout(timeout);
  }
};

export default verifyGooglePurchase;
